# Reglas para Claude Code — ccdt-back (API Express + Supabase)

Estas reglas heredan el espiritu del CLAUDE.md del front (respuestas cortas, no reescribir
archivos completos, validar antes de declarar hecho, soluciones simples, paralelizar reads).
Lo de abajo es especifico del backend.

## 1. Este repo es el dueño de las APIs
- TODA la logica de negocio, escritura y operaciones sensibles vive aca, no en el front.
- Cada recurso nuevo: route en `src/routes/`, controller en `src/controllers/`, y si aplica
  service en `src/services/`. Seguir el patron existente (ver `studentsRoutes.js` / `studentsController.js`).
- Registrar la ruta en `server.js` SIEMPRE detras de `authMiddleware`, salvo webhooks publicos
  (que van antes y validan su propia firma/secreto).

## 2. Multi-tenant: filtrar por company_id SIEMPRE
- El back usa el cliente `supabase` (anon, respeta RLS) y `supabaseAdmin` (service key, IGNORA RLS).
- Con `supabaseAdmin` no hay red de seguridad: si olvidas `.eq('company_id', req.companyId)`
  filtras datos de otra empresa. Es la vulnerabilidad #1 de esta app.
- Regla: toda query de tabla con datos por empresa DEBE filtrar por `req.companyId`
  (o pasar `p_company_id` al RPC). Nunca tomar `company_id` del body/query como verdad.
- Si una operacion es legitimamente cross-tenant o por usuario (ej: `toursController` scope por
  `req.user.id`), dejarlo explicito en un comentario.
- Preferir `supabase` (anon) sobre `supabaseAdmin` salvo que realmente necesites bypassear RLS.

## 3. Auth
- Nunca crear un endpoint sin `authMiddleware` salvo health-check o webhook con su propia validacion.
- `req.user` y `req.companyId` los pone el middleware; usarlos, no reimplementar la verificacion del token.
- No exponer ni loguear `SUPABASE_SERVICE_KEY`, claves de Firebase, ni tokens de FCM/WhatsApp.

## 4. Secrets y .env
- `.env`, `.env.local` y `auth_info_baileys/` estan en `.gitignore`: mantenerlos asi, nunca commitear.
- Toda config sensible via `process.env`. Si agregas una var nueva, documentarla en `.env.example`
  (sin el valor real).
- No pegar private keys completas ni siquiera comentadas en archivos versionados.

## 5. Carga de rutas: fallar visible, no silencioso
- El patron actual de `try/catch` que reemplaza un controller roto por `'Controller not available'`
  con HTTP 200 oculta errores en prod. Para codigo nuevo NO replicar ese fallback silencioso:
  si una ruta no carga, que el error sea visible (log + Sentry).
- No devolver 200 en respuestas de error. Usar codigos correctos (400/401/403/404/500).

## 6. Validacion de input
- Validar y tipar params/body en el controller antes de tocar la DB (existencia, tipo, rango).
- Para IDs en params, validar formato antes de la query.
- Nunca interpolar input de usuario en RPC/SQL crudo; usar siempre parametros de Supabase.

## 7. Errores y observabilidad
- Usar `next(error)` para que el `errorHandler` central responda; no inventar formatos de error nuevos.
- Sentry ya esta inicializado (`instrument.js`). No tragarse excepciones con `catch` vacio.
- No loguear datos personales (DNI, telefonos) en `morgan`/console en prod.

## 8. CORS
- En prod solo permitir origenes de la allowlist (`https://ccdt.vercel.app`). No abrir a `*` en prod.
- Si agregas un dominio nuevo de front, agregarlo a la allowlist en `server.js`, no relajar la regla.

## 9. Tests
- No hay tests aun (`npm test` es un stub). Antes de tocar logica critica (auth, company_id,
  autorizaciones, notificaciones), agregar al menos un test que cubra el happy path y el caso de
  aislamiento multi-tenant (que NO devuelva datos de otra empresa).
- Validar manualmente endpoints nuevos con un token real (o curl) antes de declarar hecho.

## 10. Servicios externos (WhatsApp / FCM / email)
- Estos servicios pueden fallar o estar deshabilitados por feature flags (`PERMITE_MAIL`,
  `PERMITE_WHATSAPP`). Respetar los flags y manejar el fallo sin tirar el request principal.
- No bloquear una respuesta de API esperando un envio de notificacion; disparar y seguir cuando aplique.

## 11. Antes de cambiar arquitectura, leer el contexto
- Revisar `server.js`, el route y el controller involucrados, y el `authMiddleware` antes de editar.
- No introducir un ORM, framework de validacion, ni capa nueva sin pedido explicito. Mantener el stack
  actual (Express + supabase-js).
