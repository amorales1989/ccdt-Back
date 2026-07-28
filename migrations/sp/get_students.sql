-- Agrega la columna baptized al SP get_students (requiere DROP porque cambia el tipo de retorno).
-- Ejecutar DESPUÉS de add_baptized_field.sql.
DROP FUNCTION IF EXISTS get_students(integer, uuid, text, text, text);

CREATE OR REPLACE FUNCTION get_students(
  p_company_id     integer,
  p_department_id  uuid    DEFAULT NULL,
  p_assigned_class text    DEFAULT NULL,
  p_gender         text    DEFAULT NULL,
  p_search         text    DEFAULT NULL
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

-- CTE 3: todos los IDs a devolver
all_ids AS (
  SELECT student_id FROM dept_ids
  UNION
  SELECT student_id FROM authorized_ids
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
  (ai.student_id IS NOT NULL) AS is_authorized,
  COALESCE(ec.cnt, 0)          AS active_enrollments_count,
  COALESCE(asgn.dept_assignments, '[]'::jsonb) AS dept_assignments
FROM students s
JOIN all_ids ON all_ids.student_id = s.id
LEFT JOIN profiles p        ON p.id = s.profile_id
LEFT JOIN dept_ids di       ON di.student_id = s.id
LEFT JOIN authorized_ids ai ON ai.student_id = s.id
LEFT JOIN departments dep   ON dep.id = s.department_id
LEFT JOIN assignments asgn  ON asgn.student_id = s.id
LEFT JOIN enrollment_counts ec ON ec.student_id = s.id
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
