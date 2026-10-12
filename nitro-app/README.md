# CAPTCHA application

Nitro application for Google authentication, CAPTCHA challenges, face verification and
liveness/PAD checks.

## Project structure

```text
app/                         Frontend entry points and UI
├── components/              Reusable CAPTCHA and face-verification components
├── composables/             Client-side state and workflow composables
├── pages/                   Application pages
├── services/                Browser-facing API clients
└── types/                   Frontend-only types

server/                      Nitro server
├── api/                     HTTP handlers grouped by bounded context
│   ├── auth/google/         Google OIDC endpoints
│   ├── challenges/          CAPTCHA challenge endpoints
│   ├── face/                Face enrollment and verification endpoints
│   └── health/              Health/readiness endpoints
├── middleware/              Request/session middleware
├── repositories/            Database and cache access
├── schemas/                 Request/response validation schemas
├── services/                Authentication, CAPTCHA, face and liveness logic
├── types/                   Server-only types
└── utils/                    Security and server helpers

shared/                      Types and contracts shared by app and server
database/                    Drizzle schema and migrations
tests/                       Unit and integration tests
infra/                       Docker, reverse proxy and deployment files
docs/                        Architecture and operational documentation
```

## Getting started

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` and set `DATABASE_URL` and `REDIS_URL` before using
database-backed routes.

## Database and Redis

Drizzle schema definitions live in `database/schema/index.ts`; generated, versioned
migrations are stored in `database/migrations`. The application does not mutate the
database schema at startup.

```bash
pnpm db:generate
pnpm db:migrate
```

PostgreSQL access is exposed through `server/repositories/db.ts` and Redis access
through `server/repositories/redis.ts`. Rate-limit counters use an atomic Redis
script (`INCR` plus first-write `EXPIRE`), while replay tokens use `SET NX EX`.
Challenge consumption is protected by a row lock and a conditional update inside a
PostgreSQL transaction.

## Deploying

```bash
pnpm build
pnpm preview
```

Then checkout the [Nitro documentation](https://nitro.build/deploy) to learn more about the different deployment presets.
