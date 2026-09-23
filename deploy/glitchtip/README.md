# GlitchTip — reemplazo self-hosted de Sentry

GlitchTip habla la misma API que Sentry, así que el código del back **no cambia**:
`instrument.js`, `Sentry.setupExpressErrorHandler(app)`, los `captureException` con
tags y el `flush()` de `uncaughtException` siguen igual. Lo único que cambia es a
dónde apunta `SENTRY_DSN`.

## 0. Requisito

Compose v2 (`docker compose`, sin guion). El `docker-compose` v1 de Ubuntu 22.04
está roto por una incompatibilidad de `requests`/`urllib3` con docker-py: falla con
`Not supported URL scheme http+docker` antes de hacer nada. Se instala con:

```bash
sudo apt-get install -y docker-compose-plugin
```

## 1. Levantar

```bash
cd deploy/glitchtip
cp .env.example .env
openssl rand -base64 48   # -> SECRET_KEY
openssl rand -base64 24   # -> POSTGRES_PASSWORD
# editar .env con esos valores y el dominio real
docker compose up -d
docker compose logs -f web
```

`migrate` corre las migraciones y termina (es normal verlo en `Exit 0`). Los que
quedan levantados son `web`, `worker`, `postgres` y `redis`.

> El `worker` no es opcional: sin él los eventos entran pero nunca se procesan ni
> aparecen en la UI, y tampoco corre la limpieza por retención.

## 2. Crear usuario y proyecto

Entrar a la URL, registrarse (el primer usuario queda como superusuario), crear la
organización y dentro de ella **dos proyectos**:

- `nexus-back` — plataforma Node.js
- `nexus-front` — plataforma React (para cuando migremos el front)

## 3. Cerrar el registro

Con tu usuario ya creado, en `deploy/glitchtip/.env`:

```
ENABLE_USER_REGISTRATION=false
```

```bash
docker compose up -d   # recrea web y worker con la nueva config
```

Si no hacés esto, cualquiera que llegue a la URL se registra solo.

## 4. Apuntar el back

Copiar el DSN del proyecto `nexus-back` (Settings → Client Keys) al `.env` del back:

```
SENTRY_DSN=https://<key>@errores.n-xus.com/1
```

Y probar:

```bash
cd ../..            # raíz de ccdt-back
node scripts/test-sentry.js
```

El evento tarda unos segundos en aparecer: lo procesa el worker, no el web.

## 5. Reverse proxy

El contenedor `web` escucha solo en `127.0.0.1`. El TLS y el dominio los pone lo que
tengas adelante.

**Con Coolify** (lo que corre en el VPS): New Resource -> Docker Compose, pegás el
`docker-compose.yml` **sin el bloque `ports`** del servicio `web` — Coolify enruta por
la red interna y emite el certificado solo. Las variables `${...}` las detecta al
parsear el compose y te las pide en la pestaña de Environment Variables. El dominio
se configura sobre el servicio `web`, apuntando al puerto 8000.

**Con Nginx/Caddy a mano**: proxy normal a `127.0.0.1:8000`. Importante que pase el
header `Host` tal cual, porque GlitchTip valida contra `GLITCHTIP_DOMAIN`.

## 6. Alertas

En el proyecto → Alerts se configuran las notificaciones. GlitchTip manda por email
(`EMAIL_URL`) y por webhook genérico.

Para reusar el bot de Telegram que ya existe en `src/services/telegramService.js`
hace falta un endpoint que reciba el webhook de GlitchTip y reenvíe el mensaje.
No está hecho todavía — queda para cuando definamos qué merece alerta y qué no.

## 7. Mantenimiento

- **Backup**: el volumen `pg-data` tiene todos los eventos. Si se pierde, se pierde
  el histórico de errores — no es crítico como los datos de la app, pero tenelo claro.
- **Disco**: `GLITCHTIP_MAX_EVENT_LIFE_DAYS` es lo único que frena el crecimiento.
  Revisá `docker system df -v` cada tanto.
- **Corre en el mismo VPS que el API**: si se cae la máquina, se cae también el
  tracker, justo cuando más lo necesitás. Las alertas de infra (health-check, cron
  caído) tienen que seguir saliendo por Telegram, que es un camino externo.
