# Deployment

## Frontend: Vercel

Set the root directory to `apps/web`.

Environment variables:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## Express API: Render or Railway

Build command:

```bash
npm install && npm run build --workspace apps/api
```

Start command:

```bash
npm run start --workspace apps/api
```

Environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `TRIAGE_SERVICE_URL`
- `GOOGLE_PLACES_API_KEY`
- `CORS_ORIGIN`

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
