# Database Migrations

Naming: `YYYYMMDDHHMMSS_description.sql`

Each file must be idempotent (use `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.).

## Running migrations

```bash
# Apply all pending migrations
node supabase/migrate.mjs

# Dry-run (print SQL without executing)
DRY_RUN=1 node supabase/migrate.mjs
```

## Convention

- One concern per file (one table, one RLS policy set, one seed batch)
- Down migrations are not supported — write forward-only compensating migrations
- All tables must have RLS enabled
- Include `created_at` and `updated_at` timestamps on every new table
