---
name: DB migration without drizzle push
description: drizzle-kit push fails in non-TTY environments when unmanaged tables exist; use psql directly instead.
---

## Rule
When `pnpm --filter @workspace/db run push` fails with "Interactive prompts require a TTY terminal" due to unmanaged tables (e.g. `user_sessions` created manually via SQL), add new columns directly:

```bash
psql "$DATABASE_URL" -c "ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <column> <type> NOT NULL DEFAULT <default>;"
```

**Why:** `connect-pg-simple` creates `user_sessions` table via raw SQL (not tracked by Drizzle). Drizzle sees it as an untracked table and prompts to drop it, which requires interactive confirmation — unavailable in bash tool.

**How to apply:** Use `psql` direct ALTER for additive schema changes. For destructive changes (drop column, rename) that need Drizzle migration files, use `drizzle-kit generate` + `drizzle-kit migrate` instead of `push`. Never use `push --force` in production.
