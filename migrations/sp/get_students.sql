-- SP de listado de miembros (GET /api/students).
--
-- Agrega p_scope_department_ids / p_scope_class: el recorte por rol que ListarAlumnos
-- hacia en el browser (traia TODA la empresa + TODAS las student_authorizations y
-- filtraba en JS, con el corte silencioso de 1000 filas de PostgREST) ahora se resuelve
-- acá. El back deriva el scope de req.profile, nunca del cliente.
--   p_scope_department_ids = NULL  -> sin recorte (admin/secretaria)
--   p_scope_department_ids = '{}'  -> ningun departamento -> 0 filas
--   p_scope_class          = NULL  -> todas las clases de esos departamentos
--
-- (requiere DROP porque cambia el tipo de retorno).
-- Ejecutar DESPUÉS de add_baptized_field.sql y add_small_groups.sql.
--
-- OJO — DROP FUNCTION borra los GRANTs y el SET search_path de la funcion. Por eso
-- va todo en una transaccion (asi GET /api/students nunca ve la funcion inexistente)
-- y al final se re-aplica el hardening de get_students_permissions.sql.
-- Correr con el rol dueño de small_group_members (supabase_admin), o el CREATE INDEX falla.
BEGIN;

DROP FUNCTION IF EXISTS get_students(integer, uuid, text, text, text);
DROP FUNCTION IF EXISTS get_students(integer, uuid, text, text, text, uuid[], text);

-- Índices de apoyo para small_group_counts (add_small_groups.sql solo crea los únicos
-- parciales por group_id, que no sirven para buscar por persona).
CREATE INDEX IF NOT EXISTS idx_small_group_members_student
  ON small_group_members(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_small_group_members_profile
  ON small_group_members(profile_id) WHERE profile_id IS NOT NULL;

CREATE OR REPLACE FUNCTION get_students(
  p_company_id     integer,
  p_department_id  uuid    DEFAULT NULL,
  p_assigned_class text    DEFAULT NULL,
  p_gender         text    DEFAULT NULL,
  p_search         text    DEFAULT NULL,
  p_scope_department_ids uuid[] DEFAULT NULL,
  p_scope_class    text    DEFAULT NULL
)
RETURNS TABLE (
  id                       uuid,
  first_name               text,
  last_name                text,
  gender                   text,
  birthdate                date,
  phone                    text,
  address                  text,
  document_number          text,
  photo_url                text,
  assigned_class           text,
  department_id            uuid,
  department_name          text,
  profile_id               uuid,
  nuevo                    boolean,
  baptized                 boolean,
  company_id               integer,
  created_at               timestamptz,
  is_authorized            boolean,
  active_enrollments_count bigint,
  small_groups_count       bigint,
  dept_assignments         jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$

-- CTE 1: IDs válidos según filtro de departamento (una sola fila por alumno)
WITH dept_ids AS (
  SELECT DISTINCT ON (s.id) s.id AS student_id,
    COALESCE(sd.assigned_class, s.assigned_class) AS resolved_class
  FROM students s
  LEFT JOIN student_departments sd
    ON sd.student_id = s.id
    AND p_department_id IS NOT NULL
    AND sd.department_id = p_department_id
    AND (p_assigned_class IS NULL OR p_assigned_class = 'all' OR sd.assigned_class ILIKE p_assigned_class)
  WHERE s.company_id = p_company_id
    AND s.deleted_at IS NULL
    AND (
      p_department_id IS NULL
      OR s.department_id = p_department_id
      OR sd.student_id IS NOT NULL
    )
    AND (
      p_assigned_class IS NULL OR p_assigned_class = 'all'
      OR s.assigned_class ILIKE p_assigned_class
      OR sd.assigned_class ILIKE p_assigned_class
    )
  ORDER BY s.id
),

-- CTE 2: Alumnos autorizados (solo cuando hay filtro dept+clase)
authorized_ids AS (
  SELECT DISTINCT sa.student_id
  FROM student_authorizations sa
  WHERE p_department_id IS NOT NULL
    AND p_assigned_class IS NOT NULL
    AND p_assigned_class <> 'all'
    AND sa.department_id = p_department_id
    AND sa.class ILIKE p_assigned_class
    AND sa.company_id = p_company_id
),

-- CTE 3a: recorte por rol - alumnos de los departamentos del usuario.
-- Replica lo que hacia ListarAlumnos en JS: pertenece al depto por la columna
-- students.department_id o por una inscripcion en student_departments, y la clase
-- matchea a nivel alumno o en la inscripcion de ese depto.
scope_ids AS (
  SELECT s.id AS student_id
  FROM students s
  WHERE p_scope_department_ids IS NOT NULL
    AND s.company_id = p_company_id
    AND s.deleted_at IS NULL
    AND (
      s.department_id = ANY(p_scope_department_ids)
      OR EXISTS (
        SELECT 1 FROM student_departments sd
        WHERE sd.student_id = s.id
          AND sd.department_id = ANY(p_scope_department_ids)
      )
    )
    AND (
      p_scope_class IS NULL
      OR s.assigned_class ILIKE p_scope_class
      OR EXISTS (
        SELECT 1 FROM student_departments sd2
        WHERE sd2.student_id = s.id
          AND sd2.department_id = ANY(p_scope_department_ids)
          AND sd2.assigned_class ILIKE p_scope_class
      )
    )
),

-- CTE 3b: recorte por rol - alumnos de otro depto autorizados a los mios.
-- class NULL o 'all' en la autorizacion = vale para cualquier clase.
scope_authorized_ids AS (
  SELECT DISTINCT sa.student_id
  FROM student_authorizations sa
  WHERE p_scope_department_ids IS NOT NULL
    AND sa.company_id = p_company_id
    AND sa.department_id = ANY(p_scope_department_ids)
    AND (
      p_scope_class IS NULL
      OR sa.class IS NULL
      OR sa.class = 'all'
      OR sa.class ILIKE p_scope_class
    )
),

-- CTE 3: todos los IDs a devolver (los filtros explicitos, recortados por el scope del rol)
all_ids AS (
  SELECT base.student_id
  FROM (
    SELECT student_id FROM dept_ids
    UNION
    SELECT student_id FROM authorized_ids
  ) base
  WHERE p_scope_department_ids IS NULL
     OR base.student_id IN (
       SELECT student_id FROM scope_ids
       UNION
       SELECT student_id FROM scope_authorized_ids
     )
),

-- CTE 4: dept_assignments agregados por alumno (sin llamadas a auth.users)
-- MATERIALIZED es obligatorio: se referencia una sola vez, asi que PG lo inlinea y el plan
-- generico (el que usa la funcion, con rows=1 estimado) lo re-ejecuta dentro de un nested loop,
-- una vez por alumno devuelto. Con 522 alumnos eso son ~2s; materializado, 40ms.
assignments AS MATERIALIZED (
  SELECT
    sd.student_id,
    jsonb_agg(
      jsonb_build_object(
        'student_id',    sd.student_id,
        'department_id', sd.department_id,
        'assigned_class',sd.assigned_class,
        'role_in_dept',  COALESCE(sd.role_in_dept, 'alumno'),
        'departments',   jsonb_build_object(
                           'id',      d.id,
                           'name',    d.name,
                           'classes', d.classes
                         )
      )
    ) AS dept_assignments
  FROM student_departments sd
  JOIN departments d ON d.id = sd.department_id
  WHERE sd.student_id IN (SELECT student_id FROM all_ids)
  GROUP BY sd.student_id
),

-- CTE 5: conteo de inscripciones activas (MATERIALIZED por el mismo motivo que CTE 4)
enrollment_counts AS MATERIALIZED (
  SELECT student_id, COUNT(*) AS cnt
  FROM student_departments
  WHERE student_id IN (SELECT student_id FROM all_ids)
  GROUP BY student_id
),

-- CTE 6: grupos pequeños activos por alumno (MATERIALIZED, mismo motivo que CTE 4).
-- El vínculo es por student_id O por profile_id: la constraint small_group_members_one_person
-- obliga a uno u otro, y los que tienen cuenta se registran con profile_id.
-- Se usa para distinguir al "miembro solo congregación" (0 departamentos Y 0 grupos)
-- del miembro que solo participa de un grupo pequeño: ambos tienen department_id NULL.
small_group_counts AS MATERIALIZED (
  SELECT s.id AS student_id, COUNT(*) AS cnt
  FROM students s
  JOIN small_group_members sgm
    ON sgm.student_id = s.id
    OR (s.profile_id IS NOT NULL AND sgm.profile_id = s.profile_id)
  WHERE s.id IN (SELECT student_id FROM all_ids)
    AND sgm.company_id = p_company_id
    AND sgm.status = 'active'
  GROUP BY s.id
)

SELECT
  s.id,
  COALESCE(p.first_name, s.first_name)       AS first_name,
  COALESCE(p.last_name, s.last_name)         AS last_name,
  COALESCE(p.gender, s.gender)               AS gender,
  COALESCE(p.birthdate::date, s.birthdate)   AS birthdate,
  COALESCE(p.phone, s.phone)                 AS phone,
  COALESCE(p.address, s.address)             AS address,
  COALESCE(p.document_number, s.document_number) AS document_number,
  COALESCE(p.photo_url, s.photo_url)         AS photo_url,
  COALESCE(di.resolved_class, s.assigned_class) AS assigned_class,
  s.department_id,
  dep.name AS department_name,
  s.profile_id,
  s.nuevo,
  COALESCE(p.baptized, s.baptized)           AS baptized,
  s.company_id,
  s.created_at,
  -- Aparece en la lista por una autorizacion y no por ser de mi depto/clase.
  (ai.student_id IS NOT NULL
    OR (sai.student_id IS NOT NULL AND sci.student_id IS NULL)) AS is_authorized,
  COALESCE(ec.cnt, 0)          AS active_enrollments_count,
  COALESCE(sgc.cnt, 0)         AS small_groups_count,
  COALESCE(asgn.dept_assignments, '[]'::jsonb) AS dept_assignments
FROM students s
JOIN all_ids ON all_ids.student_id = s.id
LEFT JOIN profiles p        ON p.id = s.profile_id
LEFT JOIN dept_ids di       ON di.student_id = s.id
LEFT JOIN authorized_ids ai ON ai.student_id = s.id
LEFT JOIN scope_ids sci     ON sci.student_id = s.id
LEFT JOIN scope_authorized_ids sai ON sai.student_id = s.id
LEFT JOIN departments dep   ON dep.id = s.department_id
LEFT JOIN assignments asgn  ON asgn.student_id = s.id
LEFT JOIN enrollment_counts ec ON ec.student_id = s.id
LEFT JOIN small_group_counts sgc ON sgc.student_id = s.id
WHERE s.deleted_at IS NULL
  AND s.company_id = p_company_id
  AND (p_gender IS NULL OR COALESCE(p.gender, s.gender) = p_gender)
  AND (
    p_search IS NULL
    OR COALESCE(p.first_name, s.first_name) ILIKE '%' || p_search || '%'
    OR COALESCE(p.last_name, s.last_name)   ILIKE '%' || p_search || '%'
  )
ORDER BY COALESCE(p.first_name, s.first_name);

$$;

-- Re-aplicar el hardening que el DROP se llevó puesto (ver get_students_permissions.sql).
-- La funcion es SECURITY DEFINER: sin search_path fijo se puede secuestrar.
ALTER FUNCTION public.get_students(integer, uuid, text, text, text, uuid[], text)
  SET search_path = public, pg_temp;

-- Cambia la firma de la funcion: PostgREST tiene que recargar su cache de schema,
-- si no el RPC responde PGRST202 hasta el proximo reload.
NOTIFY pgrst, 'reload schema';

-- El REVOKE FROM PUBLIC, anon, authenticated vive en get_students_permissions.sql y hay que
-- volver a correrlo despues de este archivo: el DROP se lleva los grants y el CREATE en
-- `public` vuelve a otorgar EXECUTE a PUBLIC. El controller llama con supabaseAdmin
-- (service_role), asi que el REVOKE no rompe GET /api/students.

COMMIT;
