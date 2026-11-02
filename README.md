# Sunset Soul

A place to keep and share the sunsets that move you. See [app-strategy-phases.md](app-strategy-phases.md) for the architecture and build plan, and the [concept](sunset-soul-concept.md) and [PRD](sunset-soul-prd.md) for the product.

## Layout

| Path | What it is |
|---|---|
| `apps/web/` | Next.js app and API, deployed to Cloudflare Workers with OpenNext |
| `services/scorer/` | Python scoring service, deployed to Cloudflare Containers |
| `db/migrations/` | Database migrations (Drizzle), owned by the web app |
| `deploy/droplet/` | Postgres + Cloudflare Tunnel stack for the DigitalOcean Droplet |
| `compose.yaml` | Local development stack |

## Local development

Requires Node.js 24+, Python 3.13+ and Docker.

```sh
npm install
docker compose up -d --wait db          # PostGIS on localhost:5432
npm run db:migrate --workspace=@sunset/web
cp apps/web/.dev.vars.example apps/web/.dev.vars
npm run dev --workspace=@sunset/web     # http://localhost:3000
```

`GET /api/health` reports whether the app can reach the database. Locally, Wrangler connects the `HYPERDRIVE` binding to the Compose database and simulates R2.

Scorer:

```sh
cd services/scorer
python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'
.venv/bin/pytest
docker compose up -d scorer             # http://localhost:8080/health
```

## Checks

```sh
npm run lint --workspace=@sunset/web
npm run typecheck --workspace=@sunset/web
npm test --workspace=@sunset/web
npm run build:worker --workspace=@sunset/web   # Cloudflare Worker build
```

CI runs the same checks on every push (`.github/workflows/ci.yml`).
