-- api.miembros_fusionar — unifica dos fichas de `students` que son la misma persona.
--
-- Caso tipico: se dio de alta un miembro solo con el nombre en un departamento, y despues
-- se descubre que esa persona ya estaba en el sistema con DNI en otro departamento. Las dos
-- fichas acumularon asistencias, observaciones y autorizaciones por separado.
--
-- La ficha `source` se absorbe (queda soft-deleted) y `target` sobrevive con TODO el historial
-- de ambas. Cada fila de `attendance` lleva su propio department_id/assigned_class, asi que
-- repuntar student_id conserva la asistencia de cada departamento por separado.
--
-- Por que un SP y no varios .from() en el controller: supabase-js no da transacciones. Si el
-- repunte de attendance sale bien y el de student_departments falla, la persona queda partida
-- a la mitad y sin forma de volver atras.
--
-- Ejecutar DESPUES de 00_create_api_schema.sql.

CREATE OR REPLACE FUNCTION api.miembros_fusionar(
  p_company_id integer,
  p_source_id  uuid,                    -- ficha absorbida (queda soft-deleted)
  p_target_id  uuid,                    -- ficha que sobrevive
  p_dry_run    boolean DEFAULT false    -- true = solo cuenta, no escribe
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source public.students%ROWTYPE;
  v_target public.students%ROWTYPE;
  v_asistencias            integer := 0;
  v_asistencias_duplicadas integer := 0;
  v_departamentos          integer := 0;
  v_observaciones          integer := 0;
  v_autorizaciones         integer := 0;
  v_ausencias              integer := 0;
  v_grupos                 integer := 0;
  v_perfil_movido          boolean := false;
BEGIN
  IF p_source_id = p_target_id THEN
    RAISE EXCEPTION 'No se puede fusionar un miembro consigo mismo'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Aislamiento multi-tenant: SECURITY DEFINER ignora RLS, el filtro lo hace la funcion.
  SELECT * INTO v_source FROM public.students
   WHERE id = p_source_id AND company_id = p_company_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La ficha a absorber no existe o ya fue eliminada'
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT * INTO v_target FROM public.students
   WHERE id = p_target_id AND company_id = p_company_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La ficha que sobrevive no existe o ya fue eliminada'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Dos cuentas de usuario distintas = decision humana, no la toma el SP.
  -- students.profile_id es UNIQUE, asi que no se pueden conservar las dos.
  IF v_source.profile_id IS NOT NULL
     AND v_target.profile_id IS NOT NULL
     AND v_source.profile_id <> v_target.profile_id THEN
    RAISE EXCEPTION 'Las dos fichas tienen cuenta de usuario propia. Dar de baja una antes de fusionar'
      USING ERRCODE = 'check_violation';
  END IF;

  ---------------------------------------------------------------------------
  -- Conteo de lo que se va a mover (sirve para el dry-run y para el resumen).
  ---------------------------------------------------------------------------
  SELECT count(*) INTO v_asistencias
    FROM public.attendance WHERE student_id = p_source_id AND company_id = p_company_id;

  -- Filas que NO se pueden repuntar y hay que colapsar:
  --   a) mismo evento en las dos fichas  -> choca contra UNIQUE (student_id, event_id)
  --   b) misma fecha + depto + clase     -> no choca, pero duplicaria la presencia
  SELECT count(*) INTO v_asistencias_duplicadas
    FROM public.attendance s
   WHERE s.student_id = p_source_id AND s.company_id = p_company_id
     AND EXISTS (
       SELECT 1 FROM public.attendance t
        WHERE t.student_id = p_target_id AND t.company_id = p_company_id
          AND (
            (s.event_id IS NOT NULL AND t.event_id = s.event_id)
            OR (s.event_id IS NULL AND t.event_id IS NULL
                AND t.date = s.date
                AND t.department_id IS NOT DISTINCT FROM s.department_id
                AND COALESCE(t.assigned_class, '') = COALESCE(s.assigned_class, ''))
          )
     );

  -- Departamentos distintos del source: la junction MAS el primario legacy, que puede
  -- no tener fila en student_departments (lo normaliza el paso 1 mas abajo).
  SELECT count(*) INTO v_departamentos FROM (
    SELECT department_id FROM public.student_departments
     WHERE student_id = p_source_id AND company_id = p_company_id
    UNION
    SELECT v_source.department_id WHERE v_source.department_id IS NOT NULL
  ) q;
  SELECT count(*) INTO v_observaciones
    FROM public.student_observations WHERE student_id = p_source_id;
  SELECT count(*) INTO v_autorizaciones
    FROM public.student_authorizations WHERE student_id = p_source_id AND company_id = p_company_id;
  SELECT count(*) INTO v_ausencias
    FROM public.student_absence_notifications WHERE student_id = p_source_id;
  SELECT count(*) INTO v_grupos
    FROM public.small_group_members WHERE student_id = p_source_id AND company_id = p_company_id;

  v_perfil_movido := v_source.profile_id IS NOT NULL AND v_target.profile_id IS NULL;

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'dry_run', true,
      'source', jsonb_build_object('id', v_source.id, 'first_name', v_source.first_name,
                                   'last_name', v_source.last_name, 'document_number', v_source.document_number),
      'target', jsonb_build_object('id', v_target.id, 'first_name', v_target.first_name,
                                   'last_name', v_target.last_name, 'document_number', v_target.document_number),
      'asistencias', v_asistencias,
      'asistencias_duplicadas', v_asistencias_duplicadas,
      'departamentos', v_departamentos,
      'observaciones', v_observaciones,
      'autorizaciones', v_autorizaciones,
      'ausencias', v_ausencias,
      'grupos_pequenos', v_grupos,
      'mueve_cuenta_usuario', v_perfil_movido
    );
  END IF;

  ---------------------------------------------------------------------------
  -- 1. Normalizar el departamento primario a la junction.
  --    El modelo viejo (students.department_id) convive con student_departments:
  --    sin esto, un depto que solo existia como primario del source se perderia.
  ---------------------------------------------------------------------------
  INSERT INTO public.student_departments (student_id, department_id, assigned_class, role_in_dept, company_id)
  SELECT s.id, s.department_id, s.assigned_class, 'alumno', s.company_id
    FROM public.students s
   WHERE s.id IN (p_source_id, p_target_id)
     AND s.department_id IS NOT NULL
  ON CONFLICT (student_id, department_id, role_in_dept) DO NOTHING;

  ---------------------------------------------------------------------------
  -- 2. attendance. Primero colapsar los choques, despues repuntar el resto.
  --    Criterio: presente gana, igual que el bool_or de api.asistencia_matriz
  --    cuando un alumno tiene mas de un registro el mismo dia.
  ---------------------------------------------------------------------------
  UPDATE public.attendance t
     SET status = true, updated_at = now()
    FROM public.attendance s
   WHERE t.student_id = p_target_id AND t.company_id = p_company_id
     AND s.student_id = p_source_id AND s.company_id = p_company_id
     AND s.status = true AND t.status = false
     AND (
       (s.event_id IS NOT NULL AND t.event_id = s.event_id)
       OR (s.event_id IS NULL AND t.event_id IS NULL
           AND t.date = s.date
           AND t.department_id IS NOT DISTINCT FROM s.department_id
           AND COALESCE(t.assigned_class, '') = COALESCE(s.assigned_class, ''))
     );

  DELETE FROM public.attendance s
   WHERE s.student_id = p_source_id AND s.company_id = p_company_id
     AND EXISTS (
       SELECT 1 FROM public.attendance t
        WHERE t.student_id = p_target_id AND t.company_id = p_company_id
          AND (
            (s.event_id IS NOT NULL AND t.event_id = s.event_id)
            OR (s.event_id IS NULL AND t.event_id IS NULL
                AND t.date = s.date
                AND t.department_id IS NOT DISTINCT FROM s.department_id
                AND COALESCE(t.assigned_class, '') = COALESCE(s.assigned_class, ''))
          )
     );

  UPDATE public.attendance
     SET student_id = p_target_id, updated_at = now()
   WHERE student_id = p_source_id AND company_id = p_company_id;

  ---------------------------------------------------------------------------
  -- 3. Resto de las tablas que cuelgan de students.
  --    Mismo patron: borrar lo que chocaria contra el UNIQUE, repuntar el resto.
  ---------------------------------------------------------------------------

  -- student_departments: UNIQUE (student_id, department_id, role_in_dept)
  DELETE FROM public.student_departments s
   WHERE s.student_id = p_source_id AND s.company_id = p_company_id
     AND EXISTS (
       SELECT 1 FROM public.student_departments t
        WHERE t.student_id = p_target_id AND t.department_id = s.department_id
          AND t.role_in_dept = s.role_in_dept
     );
  UPDATE public.student_departments SET student_id = p_target_id
   WHERE student_id = p_source_id AND company_id = p_company_id;

  -- student_authorizations: UNIQUE (student_id, department_id)
  DELETE FROM public.student_authorizations s
   WHERE s.student_id = p_source_id AND s.company_id = p_company_id
     AND EXISTS (
       SELECT 1 FROM public.student_authorizations t
        WHERE t.student_id = p_target_id AND t.department_id = s.department_id
     );
  UPDATE public.student_authorizations SET student_id = p_target_id
   WHERE student_id = p_source_id AND company_id = p_company_id;

  -- student_absence_notifications: UNIQUE (student_id, department_id)
  DELETE FROM public.student_absence_notifications s
   WHERE s.student_id = p_source_id
     AND EXISTS (
       SELECT 1 FROM public.student_absence_notifications t
        WHERE t.student_id = p_target_id AND t.department_id = s.department_id
     );
  UPDATE public.student_absence_notifications SET student_id = p_target_id
   WHERE student_id = p_source_id;

  -- small_group_members: UNIQUE parcial (group_id, student_id) WHERE student_id IS NOT NULL.
  -- Tambien hay que contemplar el vinculo por profile_id: si el target entra al grupo con su
  -- cuenta, meter ademas al source por student_id duplicaria la persona en el mismo grupo.
  DELETE FROM public.small_group_members s
   WHERE s.student_id = p_source_id AND s.company_id = p_company_id
     AND EXISTS (
       SELECT 1 FROM public.small_group_members t
        WHERE t.group_id = s.group_id
          AND (t.student_id = p_target_id
               OR (v_target.profile_id IS NOT NULL AND t.profile_id = v_target.profile_id)
               OR (v_source.profile_id IS NOT NULL AND t.profile_id = v_source.profile_id))
     );
  UPDATE public.small_group_members SET student_id = p_target_id
   WHERE student_id = p_source_id AND company_id = p_company_id;

  -- student_observations: sin UNIQUE, se repunta todo.
  UPDATE public.student_observations SET student_id = p_target_id
   WHERE student_id = p_source_id;

  ---------------------------------------------------------------------------
  -- 4. Datos personales: el target manda, el source solo rellena lo que falta.
  --    Nunca se pisa un dato existente del target.
  ---------------------------------------------------------------------------
  IF v_perfil_movido THEN
    -- students.profile_id es UNIQUE: liberar el del source antes de asignarlo.
    UPDATE public.students SET profile_id = NULL WHERE id = p_source_id;
  END IF;

  UPDATE public.students t
     SET last_name       = COALESCE(NULLIF(t.last_name, ''), NULLIF(v_source.last_name, '')),
         phone           = COALESCE(t.phone, v_source.phone),
         address         = COALESCE(t.address, v_source.address),
         birthdate       = COALESCE(t.birthdate, v_source.birthdate),
         document_number = COALESCE(t.document_number, v_source.document_number),
         photo_url       = COALESCE(t.photo_url, v_source.photo_url),
         baptized        = t.baptized OR v_source.baptized,
         profile_id      = COALESCE(t.profile_id, CASE WHEN v_perfil_movido THEN v_source.profile_id END),
         updated_at      = now()
   WHERE t.id = p_target_id;

  -- Si el target no tenia departamento primario, promover uno de la junction
  -- (puede venir del source). Sin esto quedaria como "solo congregacion".
  UPDATE public.students t
     SET department_id  = sd.department_id,
         assigned_class = sd.assigned_class,
         updated_at     = now()
    FROM (
      SELECT department_id, assigned_class
        FROM public.student_departments
       WHERE student_id = p_target_id AND company_id = p_company_id
       ORDER BY created_at
       LIMIT 1
    ) sd
   WHERE t.id = p_target_id AND t.department_id IS NULL;

  ---------------------------------------------------------------------------
  -- 5. Baja de la ficha absorbida. Soft delete: se conserva para auditoria.
  --    El DNI se libera porque los chequeos de duplicado filtran deleted_at IS NULL,
  --    pero se blanquea igual para que no reaparezca en busquedas por documento.
  ---------------------------------------------------------------------------
  UPDATE public.students
     SET deleted_at      = now(),
         document_number = NULL,
         department_id   = NULL,
         assigned_class  = NULL,
         updated_at      = now()
   WHERE id = p_source_id AND company_id = p_company_id;

  RETURN jsonb_build_object(
    'dry_run', false,
    'source_id', p_source_id,
    'target_id', p_target_id,
    'asistencias', v_asistencias,
    'asistencias_duplicadas', v_asistencias_duplicadas,
    'departamentos', v_departamentos,
    'observaciones', v_observaciones,
    'autorizaciones', v_autorizaciones,
    'ausencias', v_ausencias,
    'grupos_pequenos', v_grupos,
    'mueve_cuenta_usuario', v_perfil_movido
  );
END;
$$;

-- SECURITY DEFINER ignora RLS y la anon key viaja en el bundle del front: solo service_role.
REVOKE ALL ON FUNCTION api.miembros_fusionar(integer, uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.miembros_fusionar(integer, uuid, uuid, boolean)
  TO service_role;

-- Los repuntes y los chequeos de choque buscan por student_id en todas estas tablas.
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_student_observations_student ON public.student_observations (student_id);
CREATE INDEX IF NOT EXISTS idx_student_authorizations_student ON public.student_authorizations (student_id);
