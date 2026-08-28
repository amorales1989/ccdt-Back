-- api.contabilidad_por_motivo — totales agrupados por motivo (accountingController.getByCategory).
--
-- Alimenta la tab "Por motivos" de Contabilidad (totales + gráfico de torta). La agregación
-- se hace en la DB: traer todas las transacciones al browser para agrupar en JS se corta a las
-- 1.000 filas de PostgREST y el reporte sale incompleto en silencio.
--
-- Devuelve un array jsonb ordenado por total descendente:
--   [{ "category": "Ofrenda", "type": "ingreso", "total": 12000, "cantidad": 4 }, ...]
-- Los movimientos sin motivo se agrupan como "Sin motivo".
--
-- El scope por rol (qué departamentos puede ver el usuario) lo resuelve el controller:
-- este SP asume que el departamento ya fue autorizado.
--
-- Requiere haber corrido antes 00_create_api_schema.sql, add_accounting.sql y add_accounting_class.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('contabilidad_por_motivo', { ... })

DROP FUNCTION IF EXISTS api.contabilidad_por_motivo(integer, uuid, date, date, text);

CREATE OR REPLACE FUNCTION api.contabilidad_por_motivo(
  p_company_id     integer,
  p_department_id  uuid,
  p_from           date DEFAULT NULL,
  p_to             date DEFAULT NULL,
  p_assigned_class text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH agg AS (
  SELECT COALESCE(NULLIF(btrim(t.category), ''), 'Sin motivo') AS category,
         t.type,
         sum(t.amount) AS total,
         count(*)      AS cantidad
    FROM accounting_transactions t
   WHERE t.company_id = p_company_id
     AND t.department_id = p_department_id
     AND (p_from IS NULL OR t.movement_date >= p_from)
     AND (p_to   IS NULL OR t.movement_date <= p_to)
     AND (p_assigned_class IS NULL OR t.assigned_class = p_assigned_class)
   GROUP BY 1, 2
)
SELECT COALESCE(
  jsonb_agg(
    jsonb_build_object(
      'category', category,
      'type',     type,
      'total',    total,
      'cantidad', cantidad
    ) ORDER BY total DESC
  ),
  '[]'::jsonb
)
FROM agg;
$$;

-- SECURITY DEFINER ignora RLS y la anon key viaja en el bundle del front: solo service_role.
REVOKE ALL ON FUNCTION api.contabilidad_por_motivo(integer, uuid, date, date, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.contabilidad_por_motivo(integer, uuid, date, date, text)
  TO service_role;
