# CompCheck API

Node.js 20 + Hono backend for CompCheck.

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

## Validation

```bash
npm run typecheck
npm test
```

## Docker

```bash
docker compose up --build
```

The compose file starts PostgreSQL 15 and the API service. Database schema and migrations are added in later batches.

Local development binds to `HOST=127.0.0.1` by default. Docker Compose overrides `HOST=0.0.0.0` so the API is reachable through the published port.
