-- Cierra fuga cross-tenant en get_students.
--
-- Problema: get_students es SECURITY DEFINER (ignora RLS) y vive en `public`, donde
-- Postgres otorga EXECUTE a PUBLIC por defecto. Como anon/authenticated tienen USAGE
-- sobre `public`, cualquiera con la anon key (que viaja en el bundle del front) podia
-- hacer POST /rest/v1/rpc/get_students con un p_company_id arbitrario y leer los
-- alumnos de cualquier empresa (nombre, DNI, telefono, direccion, fecha de nacimiento).
--
-- Ademas no tenia search_path fijo, lo que habilita secuestro de search_path en una
-- funcion SECURITY DEFINER.
--
-- IMPORTANTE - ORDEN DE APLICACION:
--   1) Deployar primero el cambio en studentsController.js (supabase -> supabaseAdmin).
--   2) Recien despues correr esta migracion.
-- Si se corre al reves, GET /api/students devuelve 403 hasta que salga el deploy.

-- 1. Fijar search_path (no hace falta reescribir el cuerpo de la funcion).
ALTER FUNCTION public.get_students(integer, uuid, text, text, text, uuid[], text)
  SET search_path = public, pg_temp;

-- 2. Quitar el EXECUTE que Postgres otorga por defecto.
REVOKE ALL ON FUNCTION public.get_students(integer, uuid, text, text, text, uuid[], text)
  FROM PUBLIC, anon, authenticated;

-- 3. Dejarlo solo para el back (service_role).
GRANT EXECUTE ON FUNCTION public.get_students(integer, uuid, text, text, text, uuid[], text)
  TO service_role;
