# Uptime Kuma — caídas de servicios y heartbeats de cron

Kuma ya corre en el VPS de Coolify. Esto documenta qué monitores crear y cómo se
conectan con el código del back. No hay compose acá: la instancia ya existe, esto
es configuración + las envs del back.

**URL del panel:** está en Coolify › proyecto *Infraestructura* › Uptime Kuma › **Links**
(no va acá: este repo es público y el dominio lleva la IP del VPS).

Dos cosas de esa URL: el `:3001` que muestra Coolify es el puerto **interno** del
contenedor —desde afuera está cerrado, se entra por el proxy en el 80— y hoy es HTTP
plano, `https://` devuelve 503 porque el dominio no tiene certificado. Los heartbeats
llevan el mensaje de error del job, así que conviene emitirle un cert desde Coolify y
pasar las `KUMA_PUSH_*` a `https://`.

## 0. Alta automática (script)

Crea la notificación de Telegram y los 12 monitores de una, y al final imprime las
`KUMA_PUSH_*` listas para pegar en Coolify. Es idempotente: saltea lo que ya existe.

```bash
cd ccdt-Back
KUMA_URL=<url del panel> KUMA_USER=<usuario> KUMA_PASS='<password>' \
  node deploy/uptime-kuma/setup-monitors.js
```

- Las credenciales van por env, no quedan en ningún archivo. Si la cuenta tiene 2FA,
  sumar `KUMA_2FA=<código>`.
- El bot de Telegram lo toma del `.env` del repo (`TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`).
- Kuma no expone API REST para esto: el panel habla socket.io, y el script implementa
  el mínimo del protocolo (Engine.IO v4 por long-polling) para no sumar dependencias.

Lo que sigue es la misma configuración hecha a mano, y el detalle de por qué cada
monitor está como está.

## 1. Notificación por Telegram

El back ya tiene un bot de Telegram (`telegramService.js`). Reusar el mismo:

- *Settings › Notifications › Setup Notification*, tipo **Telegram**.
- *Bot Token* = `TELEGRAM_BOT_TOKEN`, *Chat ID* = `TELEGRAM_CHAT_ID` (las mismas de
  las envs del back en Coolify).
- Marcar **Default enabled** y **Apply on all existing monitors**.
- *Resend Notification if Down X times* = `10` (con intervalo 60s, re-avisa cada 10 min
  mientras siga caído; sin esto un aviso perdido es un aviso perdido).

## 2. Monitores HTTP

| Monitor | Tipo | URL | Ojo |
|---|---|---|---|
| API Nexus | HTTP(s) - Keyword | `https://api.n-xus.com/api/health` | Keyword `Connected` |
| WhatsApp (Baileys) | HTTP(s) | `https://api.n-xus.com/api/health/whatsapp` | Devuelve 503 si una sesión vinculada se cayó |
| Front | HTTP(s) | URL de Vercel / dominio del front | |
| GlitchTip | HTTP(s) | `https://errores.n-xus.com` | El que avisa cuando el que avisa está caído |

**Por qué keyword en el API:** `/api/health` responde `200` con `success: true` aunque
Supabase esté caído; solo cambia `"database": "Connected"` por `"Disconnected"`. Un
monitor por status code no vería esa caída.

`/api/health/whatsapp` sí usa el status code: `200` si todas las sesiones **vinculadas
en disco** están OPEN, `503` si alguna está caída. Una empresa que nunca escaneó el QR
no cuenta (no tiene `creds.json` registrado), así que no genera falsos positivos.

Intervalo sugerido: 60s, *Retries* 2 (evita alertar por un deploy de Coolify).

## 3. Heartbeats de los cron jobs

Los jobs de `src/jobs/scheduler.js` corren dentro del proceso del back: si el proceso
está vivo pero un job revienta o nunca se dispara, ningún monitor HTTP se entera.
Por eso cada job late contra un monitor **Push**.

Por cada job: *Add New Monitor › Push*, copiar la **Push URL** y cargarla en Coolify
con el nombre de env que le corresponde.

| Job (tag de Sentry) | Horario | Env | Heartbeat Interval |
|---|---|---|---|
| `cumpleanios` | 08:20 | `KUMA_PUSH_CUMPLEANIOS` | 90000 |
| `asistencia-no-tomada` | 08:35 | `KUMA_PUSH_ASISTENCIA_NO_TOMADA` | 90000 |
| `ausencias` | 08:40 | `KUMA_PUSH_AUSENCIAS` | 90000 |
| `reporte-matutino` | 09:00 | `KUMA_PUSH_REPORTE_MATUTINO` | 90000 |
| `solicitudes-pendientes` | 09:00 | `KUMA_PUSH_SOLICITUDES_PENDIENTES` | 90000 |
| `vencimiento-suscripcion` | 10:00 | `KUMA_PUSH_VENCIMIENTO_SUSCRIPCION` | 90000 |
| `reporte-nocturno` | 21:00 | `KUMA_PUSH_REPORTE_NOCTURNO` | 90000 |
| `cierre-sesiones` | 00:00 | `KUMA_PUSH_CIERRE_SESIONES` | 90000 |

- **Heartbeat Interval = 90000s (25 h)**: los jobs son diarios (86400s). Con el valor
  por defecto (60s) Kuma los daría por caídos a los 60 segundos del primer latido.
- *Retries* = 0: con un latido por día, reintentar no aporta.
- Los horarios son `America/Argentina/Buenos_Aires` (timezone del `cron.schedule`).
- El job late `up` al terminar bien y `down` con el mensaje de error si cae, además de
  reportar a GlitchTip. Un job que ni siquiera arrancó no late y Kuma avisa por
  latido faltante.

Sin la env correspondiente, `pushHeartbeat()` es no-op: se pueden monitorear los jobs
de a uno sin tocar el código.

## 4. Verificar

```bash
# 1. El endpoint de WhatsApp responde y el status code refleja el estado
curl -i https://api.n-xus.com/api/health/whatsapp

# 2. Simular un latido a mano (misma llamada que hace el back)
curl "<url del panel>/api/push/<token>?status=up&msg=prueba"
```

En Kuma el monitor pasa a verde con el mensaje `prueba`. Para probar el camino completo
desde el back, con la env cargada:

```bash
node -e "require('dotenv').config();require('./src/services/kumaService').pushHeartbeat('cumpleanios')"
```

## Pendiente relacionado

Los jobs `reporte-matutino` / `reporte-nocturno` y el `GET /api/webhooks/cron/health-check`
existen para avisar por WhatsApp que WhatsApp anda. Una vez que el monitor de
`/api/health/whatsapp` esté verde en Kuma, los tres quedan redundantes y se pueden
borrar (junto con `MONITOR_WHATSAPP_NUMBER`).
