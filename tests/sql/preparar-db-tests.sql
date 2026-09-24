-- Prepara una DB local/CI para correr los tests de integración.
--
-- La DB de producción tiene dos Database Webhooks que hacen POST a un host externo
-- (https://ccdt-back.onrender.com/api/webhooks/supabase/...) en cada INSERT/UPDATE de
-- `profiles` y `events`. El dump del esquema los arrastra a cualquier copia.
--
-- En una base de tests eso es un problema por partida doble:
--   - `authMiddleware` actualiza `last_active_at` en CADA request, así que cada llamada
--     autenticada de la suite dispara un POST saliente con la fila del perfil.
--   - En un runner de CI la extensión pg_net no está instalada, el trigger no encuentra
--     el schema `net` y falla hasta el INSERT ('schema "net" does not exist').
--
-- NO va como migración a propósito: un `supabase db push` accidental borraría estos
-- triggers en PRODUCCIÓN. Se aplica a mano sobre la DB local (ver tests/README.md) y
-- como un paso más del workflow de CI.

drop trigger if exists saludo_bienvenida on public.profiles;
drop trigger if exists notificar_eventos on public.events;
