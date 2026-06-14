# CompCheck API

Node.js 20 + Hono backend for CompCheck.

Repository-level documentation index: [`../docs/README.md`](../docs/README.md). Full deployment runbook: [`../docs/deployment.md`](../docs/deployment.md). Database schema, table meanings, field meanings, and migration SQL index: [`../docs/database.md`](../docs/database.md).

## Setup

```bash
cp .env.example .env
npm install
```

## Development

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-06-11T00:00:00.000Z"
}
```

Ingredient API:

```bash
curl "http://localhost:3000/api/ingredients?q=苯甲酸"
curl "http://localhost:3000/api/ingredients/categories"
curl "http://localhost:3000/api/ingredients/sodium-benzoate"
curl -i "http://localhost:3000/api/ingredients/not-exist"
```

Supported list query parameters:

- `q`: keyword search across Chinese name, English name, aliases, GB/INS code, E-number and description.
- `category`: exact additive category filter.
- `riskLevel`: one of `low`, `medium`, `high`, `unknown`.
- `page`: positive integer, default `1`.
- `limit`: positive integer up to `100`, default `20`.

Auth API:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"tester@example.com","password":"strong-pass"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"tester@example.com","password":"strong-pass"}'

curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"

curl -X DELETE http://localhost:3000/api/auth/account \
  -H "Authorization: Bearer $TOKEN"
```

Auth responses never include `password_hash`. JWT sessions are valid for 7 days by default and can be invalidated server-side through `/api/auth/logout`.

## Validation

```bash
npm run typecheck
npm test
npm run build
```

## Database

Start PostgreSQL:

```bash
docker compose up -d postgres
```

The default host port is `15432` to avoid colliding with an existing local PostgreSQL on `5432`.

Generate and apply Drizzle migrations:

```bash
npm run db:generate
npm run db:migrate
```

Seed the current food/additive foundation data and GB2760 official staging/fulltext/reference tables:

```bash
npm run db:seed
```

Expected output:

```text
Seeded <n> ingredients for data version ...
Seeded 2404 GB 2760 official staging records
Seeded 264 GB 2760 official full-text pages
Seeded 2800 GB 2760 official reference rows
```

## Docker

```bash
docker compose up --build
```

The compose file starts PostgreSQL 15 on host port `15432` by default and the API service on port `3000`.

Local development binds to `HOST=127.0.0.1` by default. Docker Compose overrides `HOST=0.0.0.0` so the API is reachable through the published port.

Host commands keep `DATABASE_URL=postgres://postgres:password@localhost:15432/compcheck` so Drizzle and seed scripts can connect through the published PostgreSQL port. The API container overrides `DATABASE_URL` to `postgres://postgres:password@postgres:5432/compcheck`, because `localhost` inside that container is the API container itself. These are two addresses for the same `compcheck` database, not two databases.
