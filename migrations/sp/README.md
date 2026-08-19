# Stored Procedures

Todos los SP que llama el back viven acá, uno por archivo, nombre de archivo = nombre de la función.
Las migraciones de tablas/columnas siguen en `migrations/`.

## Orden

1. `00_create_api_schema.sql` — crea el schema `api` y revoca el acceso desde el browser. Correr primero.
   Requiere además exponer `api` en el dashboard de Supabase (Settings > API > Exposed schemas).
2. El resto, en cualquier orden.

| Archivo | Función | Usado por |
|---|---|---|
| `00_create_api_schema.sql` | (schema `api` + grants) | — |
| `asistencia_matriz.sql` | `api.asistencia_matriz` | `GET /api/attendance/matrix` (reporte de asistencia en grilla) |
| `asistencia_eventos_listar.sql` | `api.asistencia_eventos_listar` | `GET /api/attendance/events` (días especiales sin clase) |
| `get_students.sql` | `public.get_students` | `GET /api/students` |
| `get_students_permissions.sql` | grants de `public.get_students` | — |
| `miembros_fusionar.sql` | `api.miembros_fusionar` | `POST /api/students/:id/merge` (unificar fichas duplicadas) |
| `miembros_archivados.sql` | `api.miembros_archivados` | `GET /api/students/archived` (archivo de ex miembros) |
| `miembro_linea_tiempo.sql` | `api.miembro_linea_tiempo` | `GET /api/students/:id/timeline` (línea cronológica) |

`get_students` quedó en `public` por historia; los SP nuevos van en `api`.

## Convención (ver regla 12 del CLAUDE.md)

- Schema `api`, nombre `dominio_accion` (`asistencia_matriz`, `contabilidad_balance`).
- `SECURITY DEFINER` + `SET search_path = public, pg_temp`, siempre.
- `p_company_id` como parámetro y filtrando por él siempre: SECURITY DEFINER ignora RLS,
  el aislamiento multi-tenant queda 100% a cargo de la función.
- `REVOKE ALL ... FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE ... TO service_role`.
- Llamada desde el back: `supabaseAdmin.schema('api').rpc('nombre', { p_company_id: req.companyId, ... })`.

## Aplicar

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/sp/asistencia_matriz.sql
```

Local (Supabase en docker):

```bash
docker exec -i supabase_db_<ref> psql -U postgres -d postgres -v ON_ERROR_STOP=1 < migrations/sp/asistencia_matriz.sql
```
