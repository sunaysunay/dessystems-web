# Verify — Post-Change Validation

description: Run after making code changes to catch hallucinated references, missing imports, broken routes, and other common agent mistakes before committing.

---

## When to use

Run `/verify` after completing any code change — especially changes made by subagents or parallel workers. This catches hallucinations before they reach production.

## Verification steps

Execute these checks in order. Report results as a checklist.

### 1. File existence check

For every file path referenced in your changes (imports, requires, hrefs, routes):

```bash
# Check if all imported/referenced files exist
# Extract imports from changed files and verify each resolves
```

- `Grep` for import statements in changed files
- `Glob` to confirm each imported path exists
- Flag any import pointing to a non-existent file

### 2. Export verification

For every symbol imported from a local file:

- `Read` the source file
- Confirm the named export actually exists
- Flag phantom exports (imported but never defined)

### 3. Database reference check

If changes reference database tables or columns:

```bash
# Verify tables exist (read-only, no confirmation needed)
des-sql.sh "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('table1','table2')"
```

```bash
# Verify columns exist
des-sql.sh "SELECT column_name FROM information_schema.columns WHERE table_name='X'"
```

### 4. API route check

If changes reference API routes:

- `Glob` for `app/api/**/{route-path}/route.ts`
- Confirm each route file exists and exports the expected HTTP methods (GET, POST, PATCH, DELETE)
- Check `export const dynamic = 'force-dynamic'` is present

### 5. Screen registry consistency (BOP screens only)

If changes add or modify BOP console screens:

- Confirm screen ID exists in `lib/screen-registry.ts`
- Confirm screen entry in `lib/bop/manifests/index.ts`
- Confirm route is listed in `middleware.ts` ROLE_MODULES
- Confirm all 5 translation files have the screen key: `messages/{en,nl,de,fr,tr}.json`
- Confirm `components/Shell.tsx` NAV entry exists

### 6. Translation completeness

If changes add i18n keys:

- `Grep` for the key across all 5 language files
- Flag any key missing from any language

### 7. Package dependency check

If changes import from npm packages:

- `Grep` for the package in `package.json`
- Flag any package used but not listed as dependency

### 8. Type safety spot-check

For TypeScript changes:

```bash
# Quick type check on changed files (if tsc available)
npx tsc --noEmit --pretty 2>&1 | head -30
```

## Output format

Report as a checklist:

```
## Verification Report

- [x] File existence: all 4 referenced files exist
- [x] Exports: all imports resolve to real exports  
- [x] Database: tables `lead`, `mail_identity` confirmed
- [ ] API route: `/api/bop/xyz/route.ts` NOT FOUND — hallucinated path
- [x] Translations: all keys present in 5 languages
- [x] Dependencies: all packages in package.json

### Issues found: 1
1. **Hallucinated API route** — `/api/bop/xyz/route.ts` does not exist. 
   The actual route is `/api/bop/sys/xyz/route.ts`.
```

## When to skip

- Pure documentation changes (markdown only)
- Git operations (branch, merge, tag)
- Config changes that don't reference code paths
