---
name: Auth session flow
description: How login, register, session persistence, and role-based redirects are implemented.
---

## Rule
- `credentials: "include"` is set as the default in `lib/api-client-react/src/custom-fetch.ts` via `credentials: init.credentials ?? "include"`.
- Login and Register pages use direct `customFetch` calls (NOT generated `useLogin`/`useRegister` hooks) so they can cache the full `SessionUser` (with `professional` field) into React Query.
- After login/register: call `setUser(res.user)` then `setLocation(getRedirectPath(res.user))`.
- `SESSION_QUERY_KEY = ["session-user"]` — must be invalidated on logout.
- `SessionUser` interface extends generated `User` with `professional: ProfessionalSession | null`.
- `/api/auth/me` backend returns `{ ...user, professional: { id, status, slug, onboardingCompleted, currentPlan, trialEndsAt } | null }`.

## Redirect logic
- `super_admin` → `/admin`
- `professional` + `onboardingCompleted` → `/dashboard`
- `professional` + `!onboardingCompleted` → `/onboarding`
- `professional` + `status === "suspended"` → `/suscripcion`
- Not authenticated → `/login`

**Why:** The generated `useLogin` hook only returns the `User` type (no `professional`), so React Query cache would miss the professional sub-data needed for routing. Direct fetch + manual cache set avoids a second round-trip.
