-- api.estadisticas_resumen — SP de la pantalla Estadísticas.
--
-- Antes el front traía la tabla `attendance` COMPLETA de la empresa (select('*') sin filtro
-- de fecha, paginando de a 1000 para saltar el corte de PostgREST), más todos los `profiles`
-- y todos los `students`, y calculaba tasa de asistencia, género, edades, altas y roles en JS.
-- Con 750 miembros y asistencia semanal eso son decenas de miles de filas por cada carga de
-- pantalla para mostrar un puñado de números agregados.
--
-- Devuelve un único jsonb con todos los bloques que consumía el useMemo de Estadisticas.tsx.
-- Los meses se devuelven como `monthKey` ('YYYY-MM'); el nombre corto en español lo arma el
-- front con date-fns (no dependemos del lc_time del server).
--
-- Scope:
--   p_department_id   depto seleccionado. NULL = "todas".
--   p_department_ids  cuando p_department_id es NULL y el rol NO es global, lista de deptos
--                     permitidos (equivale al .in('department_id', deptIds) que hacía el front).
--   p_assigned_class  NULL o 'all' = todas las clases.
--
-- Costo: una sola pasada agrupada sobre attendance (usa idx_attendance_company_date), una
-- sobre students (idx_students_company_dept) y una sobre profiles. Nada cruza filas entre sí.
--
-- Requiere haber corrido antes 00_create_api_schema.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('estadisticas_resumen', { ... })

DROP FUNCTION IF EXISTS api.estadisticas_resumen(integer, uuid, uuid[], text);

CREATE OR REPLACE FUNCTION api.estadisticas_resumen(
  p_company_id     integer,
  p_department_id  uuid   DEFAULT NULL,
  p_department_ids uuid[] DEFAULT NULL,
  p_assigned_class text   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH cfg AS (
  -- El front calcula los meses con la fecha local del navegador; fijamos el huso para que
  -- el corte de mes coincida y no se corra un mes durante la madrugada.
  SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS today,
         NULLIF(p_assigned_class, 'all') AS cls
),

-- ── Alumnos del depto en foco (SIN filtro de clase: lo necesita la distribución por clase) ──
stud_dept AS MATERIALIZED (
  SELECT s.id, s.gender, s.birthdate, s.created_at, s.nuevo, s.assigned_class,
         -- Clases del alumno dentro del depto en foco (junction). El front mira dept_assignments.
         (SELECT array_agg(sd.assigned_class)
            FROM student_departments sd
           WHERE sd.student_id = s.id
             AND (p_department_id IS NULL OR sd.department_id = p_department_id)) AS sd_classes,
         -- ¿Tiene alguna inscripción? Si no, se cae al legacy students.assigned_class.
         EXISTS (SELECT 1 FROM student_departments sd2 WHERE sd2.student_id = s.id) AS has_assigns
    FROM students s
   WHERE s.company_id = p_company_id
     AND s.deleted_at IS NULL
     AND (
       CASE
         WHEN p_department_id IS NOT NULL THEN
           s.department_id = p_department_id
           OR EXISTS (SELECT 1 FROM student_departments sd3
                       WHERE sd3.student_id = s.id AND sd3.department_id = p_department_id)
         WHEN p_department_ids IS NOT NULL THEN
           s.department_id = ANY (p_department_ids)
           OR EXISTS (SELECT 1 FROM student_departments sd3
                       WHERE sd3.student_id = s.id AND sd3.department_id = ANY (p_department_ids))
         ELSE true
       END
     )
),

-- ── Alumnos en foco (depto + clase) ──
stud AS MATERIALIZED (
  SELECT sd.*,
         EXTRACT(YEAR FROM age((SELECT today FROM cfg), sd.birthdate))::int AS age
    FROM stud_dept sd, cfg
   WHERE cfg.cls IS NULL
      OR (CASE WHEN sd.has_assigns
               THEN cfg.cls = ANY (COALESCE(sd.sd_classes, '{}'::text[]))
               ELSE sd.assigned_class = cfg.cls END)
),

-- ── Asistencia: una sola pasada, agrupada por mes ──
att_month AS MATERIALIZED (
  SELECT COALESCE(NULLIF(left(a.date, 7), ''),
                  to_char(a.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM')) AS month_key,
         count(*) FILTER (WHERE a.status)     AS present,
         count(*) FILTER (WHERE NOT a.status) AS absent
    FROM attendance a, cfg
   WHERE a.company_id = p_company_id
     AND (p_department_id IS NULL OR a.department_id = p_department_id)
     AND (p_department_id IS NOT NULL OR p_department_ids IS NULL
          OR a.department_id = ANY (p_department_ids))
     AND (cfg.cls IS NULL OR a.assigned_class = cfg.cls)
   GROUP BY 1
),
att_total AS (
  SELECT COALESCE(sum(present + absent), 0)::bigint AS total,
         COALESCE(sum(present), 0)::bigint          AS present
    FROM att_month
),

-- ── Profiles en foco ──
prof AS MATERIALIZED (
  SELECT p.id,
         p.role::text AS base_role,
         CASE
           WHEN p_department_id IS NOT NULL
                AND jsonb_array_length(COALESCE(p.assignments, '[]'::jsonb)) > 0
           THEN COALESCE((
                  SELECT array_agg(a->>'role' ORDER BY ord)
                    FROM jsonb_array_elements(p.assignments) WITH ORDINALITY t(a, ord), cfg
                   WHERE NULLIF(a->>'department_id', '')::uuid = p_department_id
                     AND (cfg.cls IS NULL OR a->>'assigned_class' = cfg.cls)
                     AND a->>'role' IS NOT NULL
                ), '{}'::text[])
           ELSE array_remove(ARRAY[p.role::text] || COALESCE(p.roles, '{}'::text[]), NULL)
         END AS eff_roles
    FROM profiles p, cfg
   WHERE p.company_id = p_company_id
     AND (
       p_department_id IS NULL
       OR (CASE
             WHEN jsonb_array_length(COALESCE(p.assignments, '[]'::jsonb)) = 0
             THEN p.department_id = p_department_id
                  AND (cfg.cls IS NULL OR p.assigned_class = cfg.cls)
             ELSE EXISTS (
                    SELECT 1 FROM jsonb_array_elements(p.assignments) a
                     WHERE NULLIF(a->>'department_id', '')::uuid = p_department_id
                       AND (cfg.cls IS NULL OR a->>'assigned_class' = cfg.cls))
           END)
     )
),

-- ── Series de meses (12 para altas, 6 para asistencia) ──
months12 AS (
  SELECT to_char((SELECT today FROM cfg) - (i || ' month')::interval, 'YYYY-MM') AS month_key,
         11 - i AS ord
    FROM generate_series(11, 0, -1) i
),
months6 AS (
  SELECT to_char((SELECT today FROM cfg) - (i || ' month')::interval, 'YYYY-MM') AS month_key,
         5 - i AS ord
    FROM generate_series(5, 0, -1) i
),
altas AS (
  SELECT to_char(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') AS month_key,
         count(*) AS cnt
    FROM stud
   GROUP BY 1
),
growth AS (
  SELECT m.month_key, m.ord, COALESCE(a.cnt, 0) AS cnt,
         -- Acumulado: los anteriores al primer mes de la serie + el running de la serie.
         (SELECT count(*) FROM altas x WHERE x.month_key < (SELECT min(month_key) FROM months12))
         + sum(COALESCE(a.cnt, 0)) OVER (ORDER BY m.ord) AS total
    FROM months12 m
    LEFT JOIN altas a ON a.month_key = m.month_key
),

-- ── Bloques de alumnos ──
gender AS (
  SELECT lower(COALESCE(NULLIF(gender, ''), 'desconocido')) AS key, count(*) AS value
    FROM stud GROUP BY 1
),
ages AS (SELECT age FROM stud WHERE birthdate IS NOT NULL AND age > 0),
buckets AS (
  SELECT b.name, b.ord,
         count(a.age) FILTER (WHERE a.age BETWEEN b.lo AND b.hi) AS value
    FROM (VALUES ('0–11',0,11,1), ('12–17',12,17,2), ('18–29',18,29,3), ('30–44',30,44,4),
                 ('45–59',45,59,5), ('60–79',60,79,6), ('80+',80,200,7)) AS b(name, lo, hi, ord)
    LEFT JOIN ages a ON true
   GROUP BY b.name, b.ord
),
exact_ages AS (
  SELECT i AS age, (SELECT count(*) FROM ages a WHERE a.age = i) AS value
    FROM generate_series(0, COALESCE((SELECT max(age) FROM ages), 0)) i
),
classes AS (
  SELECT c.cls, c.ord,
         (SELECT count(*) FROM stud_dept sd
           WHERE CASE WHEN sd.has_assigns
                      THEN c.cls = ANY (COALESCE(sd.sd_classes, '{}'::text[]))
                      ELSE sd.assigned_class = c.cls END) AS value
    FROM (SELECT cls, ord FROM departments d, unnest(d.classes) WITH ORDINALITY u(cls, ord)
           WHERE d.id = p_department_id AND d.company_id = p_company_id) c
),

-- ── Bloques de profiles ──
roles AS (
  SELECT COALESCE(eff_roles[1], base_role, 'otro') AS role, count(*) AS value
    FROM prof GROUP BY 1 ORDER BY 2 DESC LIMIT 7
),
volunteers AS (
  SELECT count(*) AS value FROM prof
   WHERE eff_roles && ARRAY['lider','maestro','auxiliar_maestro','colaborador','director','vicedirector']
)

SELECT jsonb_build_object(
  'totalStudents',           (SELECT count(*) FROM stud),
  'totalProfiles',           (SELECT count(*) FROM prof),
  'totalAttendanceRecords',  (SELECT total FROM att_total),
  'attendanceRate',          (SELECT CASE WHEN total > 0
                                          THEN round(present * 100.0 / total, 1)
                                          ELSE 0 END FROM att_total),
  'avgAge',                  (SELECT COALESCE(round(avg(age)), 0)::int FROM ages),
  'newStudents',             (SELECT count(*) FROM stud WHERE nuevo),
  'totalVolunteers',         (SELECT value FROM volunteers),
  'genderData',              COALESCE((SELECT jsonb_agg(jsonb_build_object(
                               'key',   key,
                               'name',  CASE key WHEN 'masculino' THEN 'Masculino'
                                                 WHEN 'femenino'  THEN 'Femenino'
                                                 ELSE 'Sin dato' END,
                               'value', value) ORDER BY value DESC) FROM gender), '[]'::jsonb),
  'ageBuckets',              COALESCE((SELECT jsonb_agg(jsonb_build_object(
                               'name', name, 'value', value) ORDER BY ord) FROM buckets), '[]'::jsonb),
  'exactAgeData',            COALESCE((SELECT jsonb_agg(jsonb_build_object(
                               'name', age::text, 'value', value) ORDER BY age) FROM exact_ages), '[]'::jsonb),
  'last12Months',            COALESCE((SELECT jsonb_agg(jsonb_build_object(
                               'monthKey', month_key, 'count', cnt, 'total', total) ORDER BY ord) FROM growth), '[]'::jsonb),
  'last6Months',             COALESCE((SELECT jsonb_agg(jsonb_build_object(
                               'monthKey', m.month_key,
                               'present',  COALESCE(a.present, 0),
                               'absent',   COALESCE(a.absent, 0),
                               'rate',     CASE WHEN COALESCE(a.present, 0) + COALESCE(a.absent, 0) > 0
                                                THEN round(a.present * 100.0 / (a.present + a.absent))
                                                ELSE 0 END) ORDER BY m.ord)
                               FROM months6 m LEFT JOIN att_month a ON a.month_key = m.month_key), '[]'::jsonb),
  'roleData',                COALESCE((SELECT jsonb_agg(jsonb_build_object(
                               'name',  upper(left(role, 1)) || substr(role, 2),
                               'value', value) ORDER BY value DESC) FROM roles), '[]'::jsonb),
  'classDistributionData',   COALESCE((SELECT jsonb_agg(jsonb_build_object(
                               'name', cls, 'value', value) ORDER BY ord) FROM classes), '[]'::jsonb)
);
$$;

-- SECURITY DEFINER ignora RLS y la anon key viaja en el bundle del front: solo service_role.
REVOKE ALL ON FUNCTION api.estadisticas_resumen(integer, uuid, uuid[], text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.estadisticas_resumen(integer, uuid, uuid[], text)
  TO service_role;

-- Apoyo para el filtro por depto dentro de la empresa (idx_attendance_company_date no lo cubre).
CREATE INDEX IF NOT EXISTS idx_attendance_company_dept
  ON public.attendance (company_id, department_id);

CREATE INDEX IF NOT EXISTS idx_student_departments_student
  ON public.student_departments (student_id);
