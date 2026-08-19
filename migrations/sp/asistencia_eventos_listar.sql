-- api.asistencia_eventos_listar — eventos especiales de clase (días sin lista) de un rango.
--
-- Devuelve un jsonb array ordenado por fecha:
--   [{ "id", "date", "title", "description", "color", "department_id",
--      "department", "assigned_class", "created_by", "created_at" }]
--
-- El scope es el mismo que api.asistencia_matriz: un evento con assigned_class NULL aplica a
-- todo el departamento, así que entra aunque se filtre por una clase puntual.
--
-- Requiere haber corrido antes 00_create_api_schema.sql y migrations/add_class_events.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('asistencia_eventos_listar', { ... })

DROP FUNCTION IF EXISTS api.asistencia_eventos_listar(integer, text, text, uuid, text[], text);

CREATE OR REPLACE FUNCTION api.asistencia_eventos_listar(
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
SELECT COALESCE(jsonb_agg(x ORDER BY x->>'date', x->>'title'), '[]'::jsonb)
FROM (
  SELECT jsonb_build_object(
           'id',             e.id,
           'date',           e.date,
           'title',          e.title,
           'description',    e.description,
           'color',          e.color,
           'department_id',  e.department_id,
           'department',     d.name,
           'assigned_class', e.assigned_class,
           'created_by',     e.created_by,
           'created_at',     e.created_at
         ) AS x
    FROM class_events e
    JOIN departments d ON d.id = e.department_id
   WHERE e.company_id = p_company_id
     AND e.date >= p_start
     AND e.date <= p_end
     AND (p_department_id IS NULL OR e.department_id = p_department_id)
     AND (p_department_names IS NULL
          OR lower(d.name) = ANY (SELECT lower(v) FROM unnest(p_department_names) v))
     -- assigned_class NULL en el evento = todo el departamento.
     AND (p_assigned_class IS NULL
          OR e.assigned_class IS NULL
          OR e.assigned_class ILIKE p_assigned_class)
) s;
$$;

REVOKE ALL ON FUNCTION api.asistencia_eventos_listar(integer, text, text, uuid, text[], text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.asistencia_eventos_listar(integer, text, text, uuid, text[], text)
  TO service_role;
