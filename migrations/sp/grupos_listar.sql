-- api.grupos_listar — SP del listado de grupos pequeños (smallGroupsController.getAll).
--
-- Antes: una query traía todos los grupos, otra todas las membresías activas del usuario, y
-- `attachLeaders` se traía TODOS los miembros activos de TODOS los grupos visibles (con el
-- join a profiles) sólo para contar cuántos son y quedarse con los leader/co_leader. El
-- filtrado por visibilidad se hacía después en JS, o sea que además se traían grupos que el
-- usuario no iba a ver. Ninguna de esas consultas paginaba: pasados los 1.000 miembros
-- PostgREST cortaba en silencio y los `member_count` salían mal.
--
-- Devuelve un array jsonb de grupos (todas las columnas de small_groups) con:
--   "leaders":      [{ id, first_name, last_name, role_in_group }]  (activos, leader primero)
--   "member_count": miembros activos totales, incluidos los que están a cargo
--
-- Visibilidad (replica la del controller):
--   p_global = true            → todos los grupos de la empresa (admin/secretaria).
--   si no, un grupo se ve si   → su department_id está en p_department_ids
--                            O  → el usuario (p_profile_id) es miembro ACTIVO de ese grupo.
--   p_department_ids NULL o vacío = sin alcance por departamento (sólo por membresía).
--
-- Requiere haber corrido antes 00_create_api_schema.sql.
-- Llamada: supabaseAdmin.schema('api').rpc('grupos_listar', { ... })

DROP FUNCTION IF EXISTS api.grupos_listar(integer, text, uuid, uuid[], boolean);

CREATE OR REPLACE FUNCTION api.grupos_listar(
  p_company_id     integer,
  p_status         text,
  p_profile_id     uuid,
  p_department_ids uuid[]  DEFAULT NULL,
  p_global         boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH visibles AS MATERIALIZED (
  SELECT g.*
    FROM small_groups g
   WHERE g.company_id = p_company_id
     AND g.status = p_status
     AND (
       p_global
       OR (p_department_ids IS NOT NULL
           AND g.department_id IS NOT NULL
           AND g.department_id = ANY (p_department_ids))
       OR EXISTS (SELECT 1 FROM small_group_members m
                   WHERE m.group_id = g.id
                     AND m.profile_id = p_profile_id
                     AND m.company_id = p_company_id
                     AND m.status = 'active')
     )
),
-- Una sola pasada por las membresías de los grupos visibles: cuenta y líderes salen juntos.
miembros AS MATERIALIZED (
  SELECT m.group_id,
         count(*)::int AS member_count,
         COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'id',            p.id,
               'first_name',    p.first_name,
               'last_name',     p.last_name,
               'role_in_group', m.role_in_group
             )
             ORDER BY (m.role_in_group <> 'leader'), p.first_name
           ) FILTER (WHERE m.role_in_group IN ('leader', 'co_leader') AND p.id IS NOT NULL),
           '[]'::jsonb
         ) AS leaders
    FROM small_group_members m
    LEFT JOIN profiles p ON p.id = m.profile_id
   WHERE m.company_id = p_company_id
     AND m.status = 'active'
     AND m.group_id IN (SELECT id FROM visibles)
   GROUP BY m.group_id
)
SELECT COALESCE(
  (SELECT jsonb_agg(
            to_jsonb(v) || jsonb_build_object(
              'leaders',      COALESCE(mi.leaders, '[]'::jsonb),
              'member_count', COALESCE(mi.member_count, 0)
            )
            ORDER BY v.name)
     FROM visibles v
     LEFT JOIN miembros mi ON mi.group_id = v.id),
  '[]'::jsonb
);
$$;

-- SECURITY DEFINER ignora RLS y la anon key viaja en el bundle del front: solo service_role.
REVOKE ALL ON FUNCTION api.grupos_listar(integer, text, uuid, uuid[], boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION api.grupos_listar(integer, text, uuid, uuid[], boolean)
  TO service_role;

-- Apoya tanto el EXISTS de membresía propia como el agregado por grupo.
CREATE INDEX IF NOT EXISTS idx_sg_members_company_group_status
  ON public.small_group_members (company_id, group_id, status);

CREATE INDEX IF NOT EXISTS idx_sg_members_profile_status
  ON public.small_group_members (profile_id, status);
