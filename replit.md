# Bulk Messenger

A fullstack web app for sending personalized bulk Email and WhatsApp messages from an uploaded Excel/CSV file. Operators upload contacts, configure SMTP and link a WhatsApp device, write templates with variables, then launch campaigns and watch delivery progress live.

## Stack

- **Frontend** — React + Vite + Tailwind, wouter for routing, React Query via generated `@workspace/api-client-react` hooks. Lives in `artifacts/bulk-messenger`.
- **Backend** — Express 5 (artifact `artifacts/api-server`, port 8080) with route validation via generated Zod schemas (`@workspace/api-zod`).
- **Database** — Postgres + Drizzle ORM (`@workspace/db`). Schema in `lib/db/src/schema/`.
- **Email** — `nodemailer` SMTP transporter, cached and invalidated on config save.
- **WhatsApp** — `@whiskeysockets/baileys` (pure WebSocket, no Chromium). Multi-file auth state persisted to `./.whatsapp_auth`. QR rendered to data URL via `qrcode`.
- **File parsing** — `multer` (memory storage) + `xlsx` for `.xlsx` / `.csv` uploads with auto-detect of name / email / phone columns; remaining columns are stored as JSON in `extra_json` and exposed as template variables.
- **API contract** — single source of truth at `lib/api-spec/openapi.yaml`; orval generates both the React Query client and the Zod validators.

## Database tables

- `contacts` — name, email, phone, extra_json, created_at
- `templates` — name, channel (`email` | `whatsapp`), subject, body
- `email_config` — single-row SMTP config (host, port, secure, username, password, from_email, from_name)
- `campaigns` — name, channel, template_id, status, total/sent/failed counts, rate_limit_ms, started_at, completed_at
- `campaign_messages` — per-recipient row with status (`pending` | `sent` | `failed`), attempts, error, sent_at

## Backend layout

- `src/lib/whatsapp.ts` — singleton `WhatsappManager` with `start()`, `logout()`, `sendText()`, `getStatus()`. Auto-reconnects on transient drops; clears auth on logged-out close.
- `src/lib/email.ts` — config cache, transporter cache, `verifyEmailConnection()`, `sendMail()`.
- `src/lib/template.ts` — renders `{{name}}`, `{{email}}`, `{{phone}}`, plus any extra column from the upload.
- `src/lib/campaignRunner.ts` — runs a campaign in the background using `setImmediate`, sleeps `rateLimitMs` between sends, updates per-message + aggregate counts.
- `src/routes/` — `contacts.ts`, `templates.ts`, `email.ts`, `whatsapp.ts`, `campaigns.ts`, `stats.ts`, all wired in `routes/index.ts`.

## Frontend pages

- `/` Dashboard — totals, connection status, recent campaigns
- `/contacts` — Excel/CSV drop-zone upload, contact table with row + bulk delete
- `/templates` — CRUD for email and WhatsApp templates with live placeholder preview
- `/email` — SMTP config form and Test Connection
- `/whatsapp` — Start session, QR scan, connected phone display, Logout (polls status every 2s)
- `/campaigns` — list + new-campaign form (channel, template, optional contact filter, rate-limit slider)
- `/campaigns/:id` — live campaign progress and per-recipient delivery table (polls every 2s while running)

## Notes / quirks

- Frontend POSTs the upload directly to `${BASE_URL}api/contacts/upload` as multipart `FormData` (the spec intentionally omits the multipart body to keep codegen simple).
- `protobufjs` is installed as a direct api-server dependency because Baileys requires it at runtime and esbuild externalizes it.
- Rate-limit defaults: 1500 ms between emails, 4000 ms between WhatsApp messages — keeps providers happy for casual bulk sending.
