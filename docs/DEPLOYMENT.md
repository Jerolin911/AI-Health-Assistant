# Deployment

## Frontend: Vercel

Set the root directory to `apps/web`.

Environment variables:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## Express API: Render or Railway

Render settings when deploying `apps/api` directly:

- Root Directory: `apps/api`
- Build Command: `npm install --include=dev && npm run db:deploy && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`

If you prefer Render's separate pre-deploy step, use:

- Build Command: `npm install --include=dev && npm run build`
- Pre-Deploy Command: `npm run db:deploy`
- Start Command: `npm start`

Build command:

```bash
npm install --include=dev && npm run db:deploy && npm run build
```

Start command:

```bash
npm start
```

Environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `TRIAGE_SERVICE_URL`
- `GOOGLE_PLACES_API_KEY`
- `CORS_ORIGIN`

Render provides `PORT` automatically. The API reads `PORT` in production and falls back to `API_PORT` or `4000` locally.

Local env layout:

- Root `.env` is the local backend source of truth.
- `apps/web/.env.local` is only for Next.js browser-facing values.
- Do not keep a separate `apps/api/.env` locally unless you intentionally want to override backend values.
- Render does not read local `.env` files; add backend variables in the Render Environment tab.

## Flask Triage Service

Root directory: `services/triage`

Start command:

```bash
gunicorn "app.main:app" --bind 0.0.0.0:$PORT
```

## Database

Use Supabase or Neon PostgreSQL. After setting `DATABASE_URL`, run:

```bash
npm run db:migrate --workspace apps/api
```
