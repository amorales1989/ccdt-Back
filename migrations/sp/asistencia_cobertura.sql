-- api.asistencia_cobertura — SP de "qué clases tomaron asistencia" (attendanceController.coverage).
--
-- Antes el controller hacía cuatro consultas y armaba tres mapas anidados en JS: se traía el
-- padrón completo de la empresa (students + student_departments) sólo para contar alumnos por
-- clase. Con 750 alumnos son ~1.200 filas por request, en una pantalla de uso diario. Peor:
-- ninguna de esas dos consultas paginaba, así que a partir de 1.000 filas PostgREST cortaba
-- en silencio y los totales por clase salían mal (el mismo bug que ya apareció en la matriz).
--
-- Devuelve un único jsonb:
--   { "date": "YYYY-MM-DD",
--     "departments": [{ "department_id", "name", "total_clases", "tomadas",
--                       "classes": [{ "clase", "tomada", "presentes", "total",
--                                     "sin_clase", "motivo" }] }] }
--
-- sin_clase/motivo salen de class_events: ese día la clase no se dictó (campamento, feriado...),
-- así que cuenta como resuelta y no se le reclama la lista al maestro.
--
-- Reglas que replica del controller:
--   · Un alumno cuenta en una clase por su departamento PRIMARIO (students) o por uno
--     SECUNDARIO (student_departments); se cuentan ids únicos para no duplicar.
--   · Las clases se comparan normalizadas (lower+trim), igual que hacía norm().
--   · Sólo se listan las clases de departments.classes que tengan al menos un alumno.
--   · p_fecha NULL = última fecha <= hoy (AR) cuyo día de semana esté en activity_days de
--     algún departamento del scope; si ninguno tiene días configurados, hoy.
--
-- Scope:
--   p_department_id     filtra a un departamento puntual.
--   p_department_names  nombres permitidos por rol (NULL = todos los de la empresa).
--
-- Requiere haber corrido antes 00_create_api_schema.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('asistencia_cobertura', { ... })

DROP FUNCTION IF EXISTS api.asistencia_cobertura(integer, text, uuid, text[]);

CREATE OR REPLACE FUNCTION api.asistencia_cobertura(
  p_company_id       integer,
  p_fecha            text   DEFAULT NULL,
  p_department_id    uuid   DEFAULT NULL,
  p_department_names text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH deps AS MATERIALIZED (
  SELECT d.id, d.name, d.classes, d.activity_days
    FROM departments d
   WHERE d.company_id = p_company_id
     AND (p_department_id IS NULL OR d.id = p_department_id)
     AND (p_department_names IS NULL
          OR lower(d.name) = ANY (SELECT lower(x) FROM unnest(p_department_names) x))
),
dias AS (
  SELECT DISTINCT unnest(activity_days) AS dia FROM deps
),
fecha AS (
  -- Sin fecha explícita: se retrocede hasta 6 días buscando un día de actividad. Si ningún
  -- departamento tiene activity_days configurado, la condición deja pasar los 7 y gana hoy.
  SELECT COALESCE(
    p_fecha,
    (SELECT to_char(x.d, 'YYYY-MM-DD')
       FROM (SELECT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - i) AS d
               FROM generate_series(0, 6) i) x
      WHERE NOT EXISTS (SELECT 1 FROM dias)
         OR EXTRACT(DOW FROM x.d)::smallint IN (SELECT dia FROM dias)
      ORDER BY x.d DESC
      LIMIT 1),
    to_char((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date, 'YYYY-MM-DD')
  ) AS f
),

-- ── Padrón: un alumno por (depto, clase), sin duplicar primario + secundario ──
roster AS MATERIALIZED (
  SELECT DISTINCT dept_id, cls, student_id FROM (
    SELECT s.department_id AS dept_id, btrim(lower(s.assigned_class)) AS cls, s.id AS student_id
      FROM students s
     WHERE s.company_id = p_company_id
       AND s.deleted_at IS NULL
       AND s.department_id IN (SELECT id FROM deps)
    UNION ALL
    SELECT sd.department_id, btrim(lower(sd.assigned_class)), sd.student_id
      FROM student_departments sd
      JOIN students s2 ON s2.id = sd.student_id AND s2.deleted_at IS NULL
     WHERE sd.company_id = p_company_id
       AND sd.department_id IN (SELECT id FROM deps)
  ) u
  WHERE dept_id IS NOT NULL AND cls IS NOT NULL AND cls <> '' AND student_id IS NOT NULL
),
padron AS (
  SELECT dept_id, cls, count(*)::int AS total FROM roster GROUP BY dept_id, cls
),

-- ── Asistencia tomada ese día ──
tomada AS (
  SELECT a.department_id AS dept_id,
         btrim(lower(a.assigned_class)) AS cls,
         count(*)::int                        AS total,
         count(*) FILTER (WHERE a.status)::int AS presentes
    FROM attendance a, fecha
   WHERE a.company_id = p_company_id
     AND a.date = fecha.f
     AND a.department_id IN (SELECT id FROM deps)
   GROUP BY 1, 2
),

-- ── Días marcados como evento especial (no hubo clase) ──
eventos AS (
  SELECT e.department_id AS dept_id,
         btrim(lower(e.assigned_class)) AS cls, -- NULL = todo el departamento
         e.title
    FROM class_events e, fecha
   WHERE e.company_id = p_company_id
     AND e.date = fecha.f
     AND e.department_id IN (SELECT id FROM deps)
),

-- ── Clases esperadas: las de departments.classes con al menos un alumno ──
-- Una clase con evento especial cuenta como resuelta: nadie tiene que ir a tomar esa lista.
clases AS (
  SELECT d.id AS dept_id, d.name, u.label, u.ord,
         p.total                                        AS total,
         (t.dept_id IS NOT NULL OR ev.title IS NOT NULL) AS tomada,
         COALESCE(t.presentes, 0)                       AS presentes,
         (t.dept_id IS NULL AND ev.title IS NOT NULL)   AS sin_clase,
         ev.title                                       AS motivo
    FROM deps d
    CROSS JOIN LATERAL unnest(COALESCE(d.classes, '{}'::text[])) WITH ORDINALITY u(label, ord)
    JOIN padron p ON p.dept_id = d.id AND p.cls = btrim(lower(u.label)) AND p.total > 0
    LEFT JOIN tomada t ON t.dept_id = d.id AND t.cls = btrim(lower(u.label))
    LEFT JOIN LATERAL (
      SELECT e.title
        FROM eventos e
       WHERE e.dept_id = d.id
         AND (e.cls IS NULL OR e.cls = btrim(lower(u.label)))
       ORDER BY (e.cls IS NULL) -- el evento de la clase puntual gana sobre el de todo el depto
       LIMIT 1
    ) ev ON true
)

SELECT jsonb_build_object(
  'date', (SELECT f FROM fecha),
  'departments', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'department_id', d.id,
             'name',          d.name,
             'total_clases',  (SELECT count(*) FROM clases c WHERE c.dept_id = d.id),
             'tomadas',       (SELECT count(*) FROM clases c WHERE c.dept_id = d.id AND c.tomada),
             'classes',       COALESCE((
                                SELECT jsonb_agg(jsonb_build_object(
                                         'clase',     c.label,
                                         'tomada',    c.tomada,
                                         'presentes', c.presentes,
                                         'total',     c.total,
                                         'sin_clase', c.sin_clase,
                                         'motivo',    c.motivo
                                       ) ORDER BY c.ord)
                                  FROM clases c WHERE c.dept_id = d.id
                              ), '[]'::jsonb)
           ) ORDER BY d.name)
      FROM deps d
  ), '[]'::jsonb)
);
$$;

-- SECURITY DEFINER ignora RLS y la anon key viaja en el bundle del front: solo service_role.
REVOKE ALL ON FUNCTION api.asistencia_cobertura(integer, text, uuid, text[])
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.asistencia_cobertura(integer, text, uuid, text[])
  TO service_role;

-- El padrón se filtra por (company_id, department_id) en las dos tablas del union.
CREATE INDEX IF NOT EXISTS idx_student_departments_company_dept
  ON public.student_departments (company_id, department_id);
