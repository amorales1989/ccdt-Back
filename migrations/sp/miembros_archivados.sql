-- api.miembros_archivados — listado del archivo de ex miembros.
--
-- Las bajas son soft delete: la ficha queda con `deleted_at` y todo su historial intacto.
-- Esta función es la que deja buscarlas de nuevo ("¿esta persona estuvo en la iglesia?"),
-- con el motivo, quién la dio de baja y cuánta asistencia acumuló.
--
-- Va por SP y no por PostgREST porque el conteo de asistencias por persona es una agregación:
-- traerla al browser significaría bajar todas las filas de `attendance` de cada ficha
-- (y PostgREST corta en 1000, así que el número saldría mal en silencio).
--
-- Ejecutar DESPUES de 00_create_api_schema.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('miembros_archivados', { ... })

DROP FUNCTION IF EXISTS api.miembros_archivados(integer, text, uuid, date, date, integer, integer);

CREATE OR REPLACE FUNCTION api.miembros_archivados(
  p_company_id    integer,
  p_search        text  DEFAULT NULL,   -- nombre, apellido o DNI
  p_department_id uuid  DEFAULT NULL,   -- último departamento antes de la baja
  p_desde         date  DEFAULT NULL,   -- rango sobre la fecha de baja
  p_hasta         date  DEFAULT NULL,
  p_limit         integer DEFAULT 30,
  p_offset        integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH base AS (
  -- Aislamiento multi-tenant: SECURITY DEFINER ignora RLS, el filtro lo hace la función.
  SELECT s.id, s.first_name, s.last_name, s.document_number, s.birthdate, s.gender,
         s.phone, s.address, s.photo_url, s.deleted_at, s.deleted_reason, s.deleted_by,
         s.department_id, s.assigned_class, s.created_at
  FROM students s
  WHERE s.company_id = p_company_id
    AND s.deleted_at IS NOT NULL
    -- Solo bajas hechas con motivo. Las viejas (borradas antes de que el motivo existiera,
    -- y las copias que dejaron los duplicados) no cuentan como archivo consultable: la ficha
    -- y su historial siguen en la base, pero no ensucian el listado.
    AND s.deleted_reason IS NOT NULL
    AND (p_department_id IS NULL OR s.department_id = p_department_id)
    AND (p_desde IS NULL OR s.deleted_at >= p_desde::timestamptz)
    AND (p_hasta IS NULL OR s.deleted_at < (p_hasta + 1)::timestamptz)
    AND (
      p_search IS NULL OR btrim(p_search) = ''
      OR s.document_number ILIKE '%' || btrim(p_search) || '%'
      OR btrim(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')) ILIKE '%' || btrim(p_search) || '%'
    )
),
-- Una persona puede tener varias fichas archivadas: antes nada impedía cargarla dos veces
-- (el chequeo de DNI ignoraba las borradas) y al eliminarlas quedó una fila por copia.
-- Se muestra una sola por persona, la más reciente, con el conteo de copias.
--   * Con DNI: el DNI es la identidad.
--   * Sin DNI: nombre + mismo último departamento + misma fecha de baja. Deliberadamente
--     conservador: dos personas distintas con el mismo nombre no se pisan salvo que además
--     compartan departamento y día de baja.
clave AS (
  SELECT b.*,
         COALESCE(
           NULLIF(btrim(b.document_number), ''),
           lower(btrim(COALESCE(b.first_name, '') || ' ' || COALESCE(b.last_name, '')))
             || '|' || COALESCE(b.department_id::text, '')
             || '|' || b.deleted_at::date::text
         ) AS persona
  FROM base b
),
dedup AS (
  SELECT c.*,
         row_number() OVER (PARTITION BY c.persona ORDER BY c.deleted_at DESC) AS rn,
         count(*)     OVER (PARTITION BY c.persona)                            AS fichas
  FROM clave c
),
pag AS (
  SELECT * FROM dedup
  WHERE rn = 1
  ORDER BY deleted_at DESC
  LIMIT COALESCE(p_limit, 30) OFFSET COALESCE(p_offset, 0)
)
SELECT jsonb_build_object(
  'total', (SELECT count(DISTINCT persona) FROM clave),
  'items', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id',                p.id,
      'first_name',        p.first_name,
      'last_name',         p.last_name,
      'document_number',   p.document_number,
      'birthdate',         p.birthdate,
      'gender',            p.gender,
      'phone',             p.phone,
      'address',           p.address,
      'photo_url',         p.photo_url,
      'created_at',        p.created_at,
      'deleted_at',        p.deleted_at,
      'deleted_reason',    p.deleted_reason,
      'deleted_by_name',   NULLIF(btrim(COALESCE(pr.first_name, '') || ' ' || COALESCE(pr.last_name, '')), ''),
      'department_id',     p.department_id,
      'department',        d.name,
      'assigned_class',    p.assigned_class,
      'asistencias',       COALESCE(a.presentes, 0),
      'ultima_asistencia', a.ultima,
      'fichas',            p.fichas
    ) ORDER BY p.deleted_at DESC)
    FROM pag p
    LEFT JOIN departments d  ON d.id  = p.department_id
    LEFT JOIN profiles    pr ON pr.id = p.deleted_by
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE att.status) AS presentes,
             max(att.date)                      AS ultima
      FROM attendance att
      WHERE att.student_id = p.id
        AND att.company_id = p_company_id
    ) a ON true
  ), '[]'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION api.miembros_archivados(integer, text, uuid, date, date, integer, integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.miembros_archivados(integer, text, uuid, date, date, integer, integer)
  TO service_role;

-- El archivo siempre filtra por empresa + "borrados", y ordena por fecha de baja.
CREATE INDEX IF NOT EXISTS idx_students_company_deleted_at
  ON public.students (company_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;
