-- Schema `api`: contenedor de stored procedures llamados desde el back.
--
-- Por que un schema aparte y no funciones sueltas en `public`:
-- en `public`, Postgres otorga EXECUTE a PUBLIC cada vez que se crea una funcion, y
-- anon/authenticated tienen USAGE sobre ese schema. Un REVOKE olvidado en una funcion
-- SECURITY DEFINER = fuga de datos (ver fix_get_students_permissions.sql).
-- Aca se revoca UNA vez a nivel schema + DEFAULT PRIVILEGES, y toda funcion nueva
-- nace inalcanzable desde el browser aunque uno se olvide de todo.
--
-- Es la regla 14 del CLAUDE.md (toda logica de negocio pasa por el back) aplicada a
-- nivel base de datos en vez de por convencion.

CREATE SCHEMA IF NOT EXISTS api;

-- 1. Nadie entra al schema...
REVOKE ALL ON SCHEMA api FROM PUBLIC, anon, authenticated;

-- 2. ...salvo el back.
GRANT USAGE ON SCHEMA api TO service_role;

-- 3. Toda funcion FUTURA en `api` nace sin EXECUTE para el browser.
--    Sin esto, cada CREATE FUNCTION volveria a otorgar EXECUTE a PUBLIC.
ALTER DEFAULT PRIVILEGES IN SCHEMA api
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA api
  GRANT EXECUTE ON FUNCTIONS TO service_role;

-- 4. PASO MANUAL: agregar `api` a Exposed schemas en el dashboard de Supabase
--    (Settings > API > Exposed schemas), si no PostgREST no lo enruta y las llamadas
--    dan 404. El schema queda expuesto pero solo service_role puede ejecutar: el
--    aislamiento real lo dan los grants de arriba, no el hecho de estar oculto.
--
--    Equivalente por SQL (requiere permisos de superusuario, en Supabase cloud puede
--    fallar; en ese caso usar el dashboard):
--      ALTER ROLE authenticator SET pgrst.db_schemas = 'public,graphql_public,api';
--      NOTIFY pgrst, 'reload config';

-- Convencion para las funciones de este schema:
--   - Nombre prefijado por dominio: api.contabilidad_get_balance, api.asistencia_cobertura
--   - SECURITY DEFINER + SET search_path = public, pg_temp  (siempre, sin excepcion)
--   - p_company_id SIEMPRE como parametro y SIEMPRE filtrando: SECURITY DEFINER ignora
--     RLS, asi que el aislamiento multi-tenant queda 100% a cargo de la funcion.
--     El back lo deriva del perfil (req.companyId), nunca del cliente.
--
-- Llamada desde el back:
--   await supabaseAdmin.schema('api').rpc('contabilidad_get_balance', { ... })
