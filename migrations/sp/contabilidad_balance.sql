-- api.contabilidad_balance — SP del balance por departamento (accountingController.getBalance).
--
-- Antes el controller se traía TODAS las transacciones del departamento en el rango
-- (`select('type, amount')`) para sumarlas en un for en JS. Además de transferir filas al
-- pedo, `accounting_transactions` no paginaba: pasadas las 1.000 transacciones PostgREST
-- cortaba en silencio y el balance quedaba mal sin ningún error visible.
--
-- Devuelve un único jsonb:
--   { "opening_balance": n, "total_ingresos": n, "total_egresos": n, "balance": n }
-- donde balance = opening_balance + ingresos − egresos.
--
-- Igual que el JS: todo lo que no sea type='ingreso' cuenta como egreso (la tabla ya tiene
-- un CHECK que sólo admite ingreso|egreso, pero se mantiene el criterio).
-- El rango es inclusivo en ambos extremos y cada extremo es opcional.
--
-- El scope por rol (qué departamentos puede ver el usuario) se sigue resolviendo en el
-- controller: este SP asume que el departamento ya fue autorizado.
--
-- Requiere haber corrido antes 00_create_api_schema.sql, add_accounting.sql y add_accounting_class.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('contabilidad_balance', { ... })

DROP FUNCTION IF EXISTS api.contabilidad_balance(integer, uuid, date, date);
DROP FUNCTION IF EXISTS api.contabilidad_balance(integer, uuid, date, date, text);

CREATE OR REPLACE FUNCTION api.contabilidad_balance(
  p_company_id    integer,
  p_department_id uuid,
  p_from          date DEFAULT NULL,
  p_to            date DEFAULT NULL,
  p_assigned_class text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH tot AS (
  -- Una sola pasada por idx_accounting_tx_company_dept_date.
  SELECT COALESCE(sum(t.amount) FILTER (WHERE t.type = 'ingreso'), 0)  AS ingresos,
         COALESCE(sum(t.amount) FILTER (WHERE t.type <> 'ingreso'), 0) AS egresos
    FROM accounting_transactions t
   WHERE t.company_id = p_company_id
     AND t.department_id = p_department_id
     AND (p_from IS NULL OR t.movement_date >= p_from)
     AND (p_to   IS NULL OR t.movement_date <= p_to)
     AND (p_assigned_class IS NULL OR t.assigned_class = p_assigned_class)
),
ob AS (
  -- El saldo inicial se carga por departamento: filtrando por clase no se le puede atribuir
  -- a ninguna, así que el balance de la clase es solo ingresos - egresos.
  SELECT CASE WHEN p_assigned_class IS NOT NULL THEN 0
              ELSE COALESCE((SELECT b.opening_balance
                               FROM accounting_opening_balances b
                              WHERE b.company_id = p_company_id
                                AND b.department_id = p_department_id), 0)
         END AS opening
)
SELECT jsonb_build_object(
  'opening_balance', ob.opening,
  'total_ingresos',  tot.ingresos,
  'total_egresos',   tot.egresos,
  'balance',         ob.opening + tot.ingresos - tot.egresos
)
FROM tot, ob;
$$;

-- SECURITY DEFINER ignora RLS y la anon key viaja en el bundle del front: solo service_role.
REVOKE ALL ON FUNCTION api.contabilidad_balance(integer, uuid, date, date, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.contabilidad_balance(integer, uuid, date, date, text)
  TO service_role;
