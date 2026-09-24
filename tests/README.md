# Tests de ccdt-back

```
tests/
  unit/          lógica pura, sin red ni DB (node --test)
  integration/   la app real contra la Supabase LOCAL
  helpers/       entorno, clientes, fixture de datos y arranque de la app
```

## Correrlos

```bash
npm run test:unit          # rápido, no necesita nada levantado
npm run test:integration   # necesita la Supabase local corriendo
npm test                   # los dos
```

## Preparar los tests de integración

1. Levantar la Supabase local (desde el repo del front, que tiene `supabase/config.toml`):

   ```bash
   cd ../ccdt && supabase start
   ```

2. Generar `.env.test` en este repo (está en `.gitignore`):

   ```bash
   cd ../ccdt
   { echo "NODE_ENV=test"
     supabase status -o env \
       | sed -E 's/^API_URL=/SUPABASE_URL=/; s/^ANON_KEY=/SUPABASE_ANON_KEY=/; s/^SERVICE_ROLE_KEY=/SUPABASE_SERVICE_KEY=/; s/"//g' \
       | grep -E "^(SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_KEY|JWT_SECRET)="
   } > ../ccdt-Back/.env.test
   ```

3. Desactivar los webhooks de la DB local (una vez por cada `supabase db reset`):

   ```bash
   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f tests/sql/preparar-db-tests.sql
   ```

   El esquema copiado de producción trae dos Database Webhooks que hacen POST a un host
   externo en cada INSERT/UPDATE de `profiles` y `events`. Como `authMiddleware` actualiza
   `last_active_at` en cada request, sin este paso **cada llamada autenticada de la suite
   dispara un POST saliente**. En CI además rompe: el runner no tiene `pg_net` y el trigger
   falla con `schema "net" does not exist`.

`tests/helpers/env.js` corta la corrida si `SUPABASE_URL` no apunta a `127.0.0.1`. **No es
opcional**: el `.env` normal del repo apunta a producción, y los tests de integración crean,
editan y borran filas.

## El fixture

`tests/helpers/fixture.js` arma en cada corrida dos congregaciones completas (`TEST_<run>_A` y
`TEST_<run>_B`), cada una con departamento, clases, dos alumnos y usuarios `admin` y `maestro`
con su token real de Supabase. Es lo que permite probar el aislamiento multi-tenant: token de A
pidiendo cosas de B. Al terminar se borra todo, y al empezar se limpian restos de corridas
anteriores.

Notas del harness:

- `tokenConLoginEn(token, cuando)` re-firma un token real cambiando el `amr` (momento del login).
  Es el único modo de probar el timeout por inactividad y el cierre global de sesiones: un login
  recién hecho siempre es "fresco". El token tiene que conservar el `session_id` original — GoTrue
  valida que la sesión exista.
- La integración corre con `--test-concurrency=1`: los tests comparten la misma DB local y la
  limpieza de sobras borraría el fixture de otro archivo.
