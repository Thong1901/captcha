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
database-backed routes. For Google sign-in, create an OAuth **Web application**
Client ID in [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add the exact application origin to Authorized
JavaScript origins, set `GOOGLE_CLIENT_ID`, and set `APP_ORIGIN` to the same origin.
For the default Docker setup, add both `http://localhost` and
`http://localhost:3000` to Authorized JavaScript origins, and use
`APP_ORIGIN=http://localhost:3000`. If running `pnpm dev` on port 5173, add
`http://localhost:5173` as well. No Client Secret is used
by this Google Identity Services credential flow. Real Google sign-in needs a
configured Client ID and a browser connection to Google.

With Docker Compose, put `GOOGLE_CLIENT_ID` in the repository root `.env`, then
run `docker compose up -d --build --wait` from the repository root. The browser URL
must match `APP_ORIGIN` exactly; the default is `http://localhost:3000`.

The server verifies the Google ID token signature, issuer, audience and expiry before
using its `sub` claim. It then creates a separate seven-day application session in
PostgreSQL. The browser only receives a random token in an HttpOnly, SameSite=Lax
cookie; PostgreSQL stores its SHA-256 hash. `APP_ORIGIN` protects login and logout
POST requests against cross-site submission. Set an HTTPS `APP_ORIGIN` in production
to enable Secure cookies.

## Face++ image comparison

Set both `FACE_API_KEY` and `FACE_API_SECRET` in `nitro-app/.env` for local Vite,
or in the repository root `.env` for Docker Compose. Keep the secret server-side.
Run `node --env-file=.env scripts/check-facepp.mjs` from `nitro-app` to check the
credentials without uploading an image.
The app sends a JPEG to the Nitro server, which calls Face++ Detect, creates a
FaceSet for an enrolled reference, and uses Compare for subsequent snapshots.
An account can have one active reference. The user must check the consent box
before enrollment and can delete the reference through the UI. Face++ may charge
for API calls and FaceSet storage; consult its current terms and data handling
policy before enrolling real users.

The comparison result is **image similarity only**. A still photo or replay can
produce a match. This integration has no PAD/liveness assessment, so a match
does not upgrade the application session or authorize protected actions. Add a
tested PAD flow and a separate server-side policy before using face results as
authentication. Face++ errors and missing credentials fail closed.

## Military profiles and access policy

Profiles contain name, date of birth, phone, address, unit and an optional private
portrait. Managers are limited to one assigned unit. A verified Google account can
be linked to one profile. The first system administrator is assigned by an operator
using `scripts/assign-system-admin.mjs` with the verified Google email after the
database migration; administrator role alone does not grant profile read access.

Every profile and portrait read requires an active application session and a
session-bound `view_military_profile` access grant that expires after five minutes.
The grant must reference a consumed challenge and a successful trusted PAD attempt.
The current Face++ still-image comparison does **not** create such an attempt or
grant. Profile APIs therefore deny access until a tested PAD provider is integrated.
The browser clears displayed profile data when a grant expires or the user logs out.
Portraits are re-encoded without metadata and stored in a private directory (a
separate Docker volume in Compose), never under `public/`.

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

After Compose is running, integration tests can be run from `nitro-app` with
`DATABASE_URL` pointing to the Compose PostgreSQL database and `REDIS_URL` set.
Run `pnpm test:integration`; the tests create and remove temporary users and
sessions, and exercise the live session and logout endpoints.

## Deploying

From the repository root, set `POSTGRES_PASSWORD` in `.env` (see
`../.env.example`) and run:

```bash
docker compose up -d --build --wait
docker compose ps
```

The `migrate` service applies the versioned Drizzle SQL migrations after PostgreSQL
is healthy. The app starts only after migration succeeds and Redis is healthy.
The app is available at `http://127.0.0.1:3000` (override with `APP_PORT`).
The Dockerfile builds the frontend, Nitro server and migration runner in a builder
stage. The runtime image contains only `.output` and the SQL migrations; it does
not contain the source tree, pnpm or `node_modules`.

For a local build outside Docker:

```bash
pnpm build
pnpm build:migrate
node .output/server/index.mjs
```
