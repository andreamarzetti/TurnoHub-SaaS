# TurnoHub

Sistema de reservas y turnos online para profesionales y pequeños negocios en Latinoamérica.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/turnohub run dev` — run the frontend (port 26195)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — Session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + shadcn/ui + Wouter + Framer Motion
- API: Express 5 + express-session + bcrypt
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/` — Generated Zod schemas for server validation
- `lib/db/src/schema/` — Drizzle DB schema (users, professionals, services, availability, appointments, clients, subscriptions)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/turnohub/src/` — React frontend (pages, components, auth context)

## Architecture decisions

- Orval configured with `mode: "single"` for the Zod output to avoid TS name collision between Zod schemas and generated TypeScript interfaces
- Session-based auth via `express-session` + `connect-pg-simple` (stored in PostgreSQL)
- Public booking page (`/booking/:slug`) works without login — client-facing flow
- Professional slug auto-generated from name on registration, guaranteed unique
- 14-day trial on registration, subscriptions stored in DB linked to professional

## Product

- **Landing page** — Hero, features, professional types, pricing (Básico $9.900 / Profesional $14.900 / Premium $19.900), CTA
- **Register / Login** — Session-based auth for professionals
- **Professional Dashboard** — Dashboard stats, calendar, appointments CRUD, services CRUD, schedule, clients, settings, subscription
- **Super Admin** — Global stats, professionals management (suspend, change plan)
- **Public Booking** — Multi-step booking flow at `/booking/:slug` (no login required)

## User preferences

- Language: Spanish (es-AR)
- Currency: ARS (Argentine Peso)
- Design: White background, modern Calendly-like, mobile-first

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` AND `pnpm run typecheck:libs` before building
- Orval zod output uses `mode: "single"` targeting `generated/api.ts` directly — do NOT add `schemas` config back or it will cause TS2308 collision
- `lib/api-zod/src/index.ts` exports only `./generated/api` (not `./generated/types` — that folder is not generated)
- `req.params` values in Express routes must be wrapped with `String()` before `parseInt()` to satisfy TypeScript

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
