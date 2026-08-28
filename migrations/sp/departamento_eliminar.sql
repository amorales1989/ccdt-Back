-- api.departamento_eliminar — borra un departamento reasignando a sus miembros.
--
-- Antes el DELETE lo rechazaba Postgres: students.department_id y profiles.department_id
-- referencian departments(id) sin ON DELETE, así que con un solo miembro asociado el borrado
-- fallaba con un error de constraint (el front mostraba "No se pudo eliminar el departamento").
--
-- Ahora, en una sola transacción:
--   1. Los miembros que tienen OTRA asignación en student_departments pasan a ese departamento
--      (department_id + assigned_class de la otra asignación).
--   2. Los que no tienen otra quedan sin departamento (department_id y assigned_class en NULL):
--      siguen siendo miembros de la congregación.
--   3. Los perfiles (usuarios) asignados quedan sin departamento y se les saca el nombre del
--      array profiles.departments.
--   4. Se borra el departamento; student_departments cae por ON DELETE CASCADE.
--
-- Con p_dry_run = true no modifica nada: solo devuelve los conteos, para avisar en el diálogo
-- de confirmación a cuántos miembros afecta.
--
-- Devuelve:
--   { "miembros": n, "miembros_sin_departamento": n, "miembros_reasignados": n, "usuarios": n, "eliminado": bool }
--
-- Requiere haber corrido antes 00_create_api_schema.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('departamento_eliminar', { ... })

DROP FUNCTION IF EXISTS api.departamento_eliminar(integer, uuid, boolean);

CREATE OR REPLACE FUNCTION api.departamento_eliminar(
  p_company_id    integer,
  p_department_id uuid,
  p_dry_run       boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name          text;
  v_miembros      integer;
  v_reasignados   integer;
  v_sin_depto     integer;
  v_usuarios      integer;
BEGIN
  SELECT name INTO v_name
    FROM departments
   WHERE id = p_department_id AND company_id = p_company_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Departamento no encontrado';
  END IF;

  -- Miembros cuyo departamento principal es el que se borra.
  SELECT count(*) INTO v_miembros
    FROM students s
   WHERE s.company_id = p_company_id AND s.department_id = p_department_id;

  -- De esos, los que tienen otra asignación a la que mudarse.
  SELECT count(*) INTO v_reasignados
    FROM students s
   WHERE s.company_id = p_company_id
     AND s.department_id = p_department_id
     AND EXISTS (SELECT 1 FROM student_departments sd
                  WHERE sd.student_id = s.id
                    AND sd.department_id <> p_department_id);

  v_sin_depto := v_miembros - v_reasignados;

  SELECT count(*) INTO v_usuarios
    FROM profiles p
   WHERE p.company_id = p_company_id AND p.department_id = p_department_id;

  IF NOT p_dry_run THEN
    -- 1. Los que tienen otra asignación se mudan a ella (la más antigua, criterio estable).
    UPDATE students s
       SET (department_id, assigned_class) = (
             SELECT sd.department_id, sd.assigned_class
               FROM student_departments sd
              WHERE sd.student_id = s.id
                AND sd.department_id <> p_department_id
              ORDER BY sd.created_at
              LIMIT 1
           )
     WHERE s.company_id = p_company_id
       AND s.department_id = p_department_id
       AND EXISTS (SELECT 1 FROM student_departments sd
                    WHERE sd.student_id = s.id
                      AND sd.department_id <> p_department_id);

    -- 2. El resto queda como miembro de la congregación sin departamento.
    UPDATE students
       SET department_id = NULL, assigned_class = NULL
     WHERE company_id = p_company_id
       AND department_id = p_department_id;

    -- 3. Usuarios asignados: se les quita el departamento (id y nombre en el array).
    UPDATE profiles
       SET department_id = NULL,
           departments = COALESCE(array_remove(departments, v_name), departments)
     WHERE company_id = p_company_id
       AND department_id = p_department_id;

    -- El nombre puede seguir en el array de usuarios que no lo tenían como principal.
    UPDATE profiles
       SET departments = array_remove(departments, v_name)
     WHERE company_id = p_company_id
       AND departments @> ARRAY[v_name];

    -- 4. student_departments cae por ON DELETE CASCADE.
    DELETE FROM departments
     WHERE id = p_department_id AND company_id = p_company_id;
  END IF;

  RETURN jsonb_build_object(
    'miembros', v_miembros,
    'miembros_reasignados', v_reasignados,
    'miembros_sin_departamento', v_sin_depto,
    'usuarios', v_usuarios,
    'eliminado', NOT p_dry_run
  );
END;
$$;

-- SECURITY DEFINER ignora RLS y la anon key viaja en el bundle del front: solo service_role.
REVOKE ALL ON FUNCTION api.departamento_eliminar(integer, uuid, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.departamento_eliminar(integer, uuid, boolean)
  TO service_role;
