# BOT — Asistente de WhatsApp (Syntax Servicio Técnico)

Backend NestJS que atiende clientes por WhatsApp Business: transcribe audios, agenda/reprograma/cancela
citas en Google Calendar, responde con reglas (Google Sheets / precios en Google Docs) y, si nada aplica,
con Gemini + RAG. Expone además una API REST y un WebSocket para un panel de administración.

## Arquitectura

```
src/
├── whatsapp/         webhook (controller delgado) + WhatsAppMessageHandler (orquestación)
├── gemini/ openai/   LLM de chat / transcripción Whisper
├── rag/              chunking + embeddings (persistidos en BD) + búsqueda por similitud
├── conversation/     historial de mensajes
├── chats/ clients/   CRUD del panel
├── google-calendar/  citas + recordatorios (1 h y 20 min antes)
├── google-docs/ google-sheets/   base de conocimiento y respuestas por palabra clave
├── events/           WebSocket para el panel
└── common/guards/    ApiKeyGuard
migrations/           SQL versionado (npm run migrate)
```

Flujo de `POST /whatsapp/webhook`: se valida la firma, se responde `200` de inmediato y el mensaje se
procesa en segundo plano (cola por usuario, deduplicación persistente en la tabla `processed_messages`):
audio → cliente/chat → intención de cita → palabra clave → precios → Gemini + RAG.

## Seguridad

- **Endpoints de administración** (`/chats`, `/clients`, `/google-*`, `/gemini`, `/openai`, `POST /whatsapp/send`):
  requieren `ADMIN_API_KEY` en el header `x-api-key` o `Authorization: Bearer <clave>`.
  Si la variable no está definida, se rechaza todo.
- **WebSocket**: conectar con `ws://host/?token=<ADMIN_API_KEY>`.
- **Webhook de Meta**: se valida `X-Hub-Signature-256` con `WHATSAPP_APP_SECRET`
  (si no está definida se omite la validación y se registra una advertencia; **definirla en producción**).
- **CORS**: solo los orígenes de `CORS_ORIGINS` (lista separada por comas).
- `.env` no se versiona; usar `.env.example` como plantilla.

## Variables de entorno

Ver `.env.example`.

## Base de datos y migraciones

El esquema se gestiona con los SQL de `migrations/`:

```bash
npm run migrate                                   # aplica las pendientes
npm run migrate -- --baseline 005_create_clients_and_relations.sql
# ^ para una BD que ya tiene el esquema 001–005: las marca como aplicadas sin ejecutarlas
```

`synchronize` de TypeORM está desactivado; en desarrollo local puede activarse con `DB_SYNCHRONIZE=true`.

Integridad (migración 007): `chats.tags` es `json`; FKs con `ON DELETE SET NULL` en `messages`, `chats` y `appointments`
(incluido `appointments.chatId`); `CHECK (endDateTime > startDateTime)`; teléfono de cliente único; índices compuestos
para historial, recordatorios y listado de chats. Borrar un chat elimina también su historial.
Las reservas se serializan con un lock de MySQL (`GET_LOCK`) para evitar doble reserva.

### Base de datos local de desarrollo

Configura la conexión en `.env` (no versionado):

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=<usuario>
DB_PASS=<contraseña>
DB_NAME=bot_db
DB_TIMEZONE=Z
```

```bash
mysql -u <usuario> -p -e "CREATE DATABASE bot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
npm run migrate
```

`DB_TIMEZONE=Z` guarda las fechas en UTC (por defecto se usa la hora local del proceso).
`MESSAGE_RETENTION_DAYS=N` borra mensajes de más de N días (desactivado por defecto).

## Ejecutar

```bash
npm install
npm run start:dev      # desarrollo
npm run build && npm run start:prod
npm test               # tests unitarios
```

## Google Calendar

```env
GOOGLE_CREDENTIALS={"client_email":"...","private_key":"..."}
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_CALENDAR_TIME_ZONE=America/Argentina/Buenos_Aires
TZ=America/Argentina/Buenos_Aires
```

Las fechas siempre deben incluir zona horaria explícita (`2026-04-15T15:00:00-03:00`).

```
GET  /google-calendar/appointments?timeMin=...&timeMax=...
GET  /google-calendar/availability?startDateTime=...&endDateTime=...
POST /google-calendar/appointments
POST /google-calendar/appointments/reschedule
POST /google-calendar/appointments/cancel
```

## Despliegue (Railway)

`railway.toml` define build con Nixpacks, healthcheck en `/` y reinicio ante fallos. Ejecutar
`npm run migrate` en cada despliegue antes de arrancar.
