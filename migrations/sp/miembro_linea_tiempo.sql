-- api.miembro_linea_tiempo — todo lo que pasó con una persona, en orden cronológico.
--
-- Une dos cosas distintas:
--   1. Los movimientos, que solo existen porque los registramos: `student_events`
--      (alta, baja, promoción, cambio de departamento, fusión, reactivación...).
--   2. Los hechos que ya tenían fecha propia y NO se duplican en la bitácora:
--      observaciones, autorizaciones firmadas, grupos pequeños y asistencia.
--
-- La asistencia se agrega por mes y departamento a propósito: una persona con cinco años
-- de historia tiene ~250 filas de `attendance`, y una línea de tiempo con 250 renglones de
-- "vino el domingo" no se lee. Queda "Marzo 2025 · Adolescentes: 4 de 5".
--
-- Funciona igual con fichas activas y archivadas: el archivo de ex miembros usa esta misma
-- función para mostrar la historia de alguien que ya no está.
--
-- Ejecutar DESPUES de 00_create_api_schema.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('miembro_linea_tiempo', { ... })

DROP FUNCTION IF EXISTS api.miembro_linea_tiempo(integer, uuid);

CREATE OR REPLACE FUNCTION api.miembro_linea_tiempo(
  p_company_id integer,
  p_student_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH miembro AS (
  -- Aislamiento multi-tenant: si la ficha no es de esta empresa, no hay nada que contar.
  SELECT s.*, d.name AS department_name
  FROM students s
  LEFT JOIN departments d ON d.id = s.department_id
  WHERE s.id = p_student_id AND s.company_id = p_company_id
),
eventos AS (
  SELECT e.event_type                AS tipo,
         e.occurred_at               AS fecha,
         d.name                      AS departamento,
         e.actor_name                AS actor,
         e.detail                    AS detalle
  FROM student_events e
  LEFT JOIN departments d ON d.id = e.department_id
  WHERE e.student_id = p_student_id AND e.company_id = p_company_id
),
observaciones AS (
  SELECT 'observacion'::text AS tipo,
         o.created_at        AS fecha,
         d.name              AS departamento,
         NULLIF(btrim(COALESCE(pr.first_name, '') || ' ' || COALESCE(pr.last_name, '')), '') AS actor,
         jsonb_build_object('texto', o.observation) AS detalle
  FROM student_observations o
  LEFT JOIN departments d  ON d.id  = o.department_id
  LEFT JOIN profiles    pr ON pr.id = o.created_by
  WHERE o.student_id = p_student_id AND o.company_id = p_company_id
),
autorizaciones AS (
  SELECT 'autorizacion'::text AS tipo,
         au.created_at        AS fecha,
         d.name               AS departamento,
         NULL::text           AS actor,
         jsonb_build_object('clase', au.class) AS detalle
  FROM student_authorizations au
  LEFT JOIN departments d ON d.id = au.department_id
  WHERE au.student_id = p_student_id AND au.company_id = p_company_id
),
grupos AS (
  SELECT 'grupo_pequeno'::text AS tipo,
         COALESCE(m.approved_at, m.requested_at, m.created_at) AS fecha,
         NULL::text            AS departamento,
         NULL::text            AS actor,
         jsonb_build_object(
           'grupo',  g.name,
           'rol',    m.role_in_group,
           'estado', m.status
         ) AS detalle
  FROM small_group_members m
  JOIN small_groups g ON g.id = m.group_id
  WHERE m.student_id = p_student_id AND m.company_id = p_company_id
),
asistencia AS (
  -- Un renglón por mes y departamento, no por domingo.
  SELECT 'asistencia_mes'::text AS tipo,
         date_trunc('month', att.date::date)::timestamptz AS fecha,
         d.name                                           AS departamento,
         NULL::text                                       AS actor,
         jsonb_build_object(
           'presentes', count(*) FILTER (WHERE att.status),
           'total',     count(*),
           'clase',     max(att.assigned_class)
         ) AS detalle
  FROM attendance att
  LEFT JOIN departments d ON d.id = att.department_id
  WHERE att.student_id = p_student_id
    AND att.company_id = p_company_id
    AND att.date ~ '^\d{4}-\d{2}-\d{2}$'   -- `date` es varchar: descarta basura antes de castear
  GROUP BY 2, 3
),
todo AS (
  SELECT * FROM eventos
  UNION ALL SELECT * FROM observaciones
  UNION ALL SELECT * FROM autorizaciones
  UNION ALL SELECT * FROM grupos
  UNION ALL SELECT * FROM asistencia
)
SELECT jsonb_build_object(
  'miembro', (
    SELECT jsonb_build_object(
      'id',              m.id,
      'first_name',      m.first_name,
      'last_name',       m.last_name,
      'document_number', m.document_number,
      'photo_url',       m.photo_url,
      'department',      m.department_name,
      'assigned_class',  m.assigned_class,
      'created_at',      m.created_at,
      'deleted_at',      m.deleted_at,
      'deleted_reason',  m.deleted_reason,
      'activo',          m.deleted_at IS NULL
    ) FROM miembro m
  ),
  'items', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'tipo',         t.tipo,
      'fecha',        t.fecha,
      'departamento', t.departamento,
      'actor',        t.actor,
      'detalle',      t.detalle
    ) ORDER BY t.fecha DESC)
    FROM todo t
    WHERE t.fecha IS NOT NULL
  ), '[]'::jsonb)
)
WHERE EXISTS (SELECT 1 FROM miembro);
$$;

REVOKE ALL ON FUNCTION api.miembro_linea_tiempo(integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION api.miembro_linea_tiempo(integer, uuid) TO service_role;

-- La línea de tiempo pide siempre "todo lo de esta persona" en estas tablas.
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_student_observations_student ON public.student_observations (student_id);
CREATE INDEX IF NOT EXISTS idx_student_authorizations_student ON public.student_authorizations (student_id);
