-- api.asistencia_matriz — SP del reporte de asistencia en grilla (matriz).
--
-- Antes el front traía todas las asistencias del año con joins anidados (students,
-- departments) vía PostgREST: miles de filas, payload de MBs y corte silencioso en
-- 1000 filas (faltaban las últimas fechas del reporte).
--
-- Devuelve un único jsonb ya agregado:
--   { "dates":  ["2026-03-07", ...],
--     "rows":   [{ "student_id": "...", "marks": "PPA-P", "total": 3 }],
--     "events": [{ "date": "2026-03-14", "title": "Campamento", "color": "amber", ... }] }
-- donde `marks` tiene un caracter por fecha de `dates` (P=presente, A=ausente, -=sin registro).
-- Solo aparecen los alumnos con al menos un registro; el front completa el resto con '-'.
--
-- `events` son los días especiales de class_events (no se tomó lista porque hubo otra actividad).
-- Esas fechas se suman a `dates` aunque no tengan ni un registro de asistencia: si no, la columna
-- no existiría en la grilla y el día desaparecería del reporte. Quedan en '-' para todos.
--
-- Requiere haber corrido antes 00_create_api_schema.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('asistencia_matriz', { ... })
--
-- NOTA: attendance.date es varchar 'YYYY-MM-DD', por eso el rango se compara como texto
-- (el orden lexicográfico coincide con el cronológico en ISO y usa idx_attendance_date).

DROP FUNCTION IF EXISTS api.asistencia_matriz(integer, text, text, uuid, text[], text);

CREATE OR REPLACE FUNCTION api.asistencia_matriz(
  p_company_id       integer,
  p_start            text,
  p_end              text,
  p_department_id    uuid   DEFAULT NULL,
  p_department_names text[] DEFAULT NULL,
  p_assigned_class   text   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH att AS (
  -- bool_or: si un alumno tiene más de un registro el mismo día (ej. dos deptos), cuenta como presente.
  SELECT a.student_id, a.date, bool_or(a.status) AS status
  FROM attendance a
  -- attendance.department (texto) esta NULL en toda la tabla: el departamento se resuelve por
  -- department_id, con fallback al departamento primario del alumno (igual que hacia el front).
  LEFT JOIN departments dep ON dep.id = a.department_id
  LEFT JOIN students s ON s.id = a.student_id
  LEFT JOIN departments sdep ON sdep.id = s.department_id
  WHERE a.company_id = p_company_id
    AND a.student_id IS NOT NULL
    AND a.date >= p_start
    AND a.date <= p_end
    AND (p_department_id IS NULL OR a.department_id = p_department_id)
    AND (
      p_department_names IS NULL
      OR lower(COALESCE(dep.name, sdep.name, a.department))
         = ANY (SELECT lower(x) FROM unnest(p_department_names) x)
    )
    AND (p_assigned_class IS NULL OR a.assigned_class ILIKE p_assigned_class)
  GROUP BY a.student_id, a.date
),
ev AS (
  -- Días especiales del mismo scope. assigned_class NULL en el evento = todo el departamento.
  SELECT e.id, e.date, e.title, e.description, e.color,
         e.department_id, dp.name AS department, e.assigned_class
  FROM class_events e
  JOIN departments dp ON dp.id = e.department_id
  WHERE e.company_id = p_company_id
    AND e.date >= p_start
    AND e.date <= p_end
    AND (p_department_id IS NULL OR e.department_id = p_department_id)
    AND (
      p_department_names IS NULL
      OR lower(dp.name) = ANY (SELECT lower(x) FROM unnest(p_department_names) x)
    )
    AND (p_assigned_class IS NULL
         OR e.assigned_class IS NULL
         OR e.assigned_class ILIKE p_assigned_class)
),
d AS (
  -- Fechas con actividad + fechas de eventos, numeradas: idx = posición dentro de `marks`.
  SELECT date, row_number() OVER (ORDER BY date)::int AS idx
  FROM (SELECT date FROM att UNION SELECT date FROM ev) x
),
n AS (SELECT count(*)::int AS total FROM d),
seq AS (
  -- Una fila por registro real (nada de cruzar alumnos × fechas: eso hacía nested loop
  -- sobre la CTE y el año entero se iba a statement timeout).
  SELECT a.student_id,
         d.idx,
         CASE WHEN a.status THEN 'P' ELSE 'A' END AS mark,
         d.idx - COALESCE(lag(d.idx) OVER (PARTITION BY a.student_id ORDER BY d.idx), 0) - 1 AS gap
  FROM att a
  JOIN d ON d.date = a.date
),
marks AS (
  -- Los huecos (fechas sin registro) se rellenan con el `gap` previo y el resto al final.
  SELECT student_id,
         string_agg(repeat('-', gap) || mark, '' ORDER BY idx)
           || repeat('-', (SELECT total FROM n) - max(idx)) AS marks,
         count(*) FILTER (WHERE mark = 'P') AS total
  FROM seq
  GROUP BY student_id
)
SELECT jsonb_build_object(
  'dates', COALESCE((SELECT jsonb_agg(date ORDER BY date) FROM d), '[]'::jsonb),
  'rows',  COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'student_id', student_id,
               'marks',      marks,
               'total',      total
             ))
             FROM marks
           ), '[]'::jsonb),
  'events', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'id',             id,
               'date',           date,
               'title',          title,
               'description',    description,
               'color',          color,
               'department_id',  department_id,
               'department',     department,
               'assigned_class', assigned_class
             ) ORDER BY date, title)
             FROM ev
           ), '[]'::jsonb)
);
$$;

-- El schema `api` ya revoca por DEFAULT PRIVILEGES, pero lo dejamos explícito: SECURITY
-- DEFINER ignora RLS y la anon key viaja en el bundle del front.
REVOKE ALL ON FUNCTION api.asistencia_matriz(integer, text, text, uuid, text[], text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.asistencia_matriz(integer, text, text, uuid, text[], text)
  TO service_role;

-- Índice de apoyo para el rango de fechas por empresa (idx_attendance_date no filtra por empresa).
CREATE INDEX IF NOT EXISTS idx_attendance_company_date
  ON public.attendance (company_id, date);
