# Push — Commit & Deploy Migration

description: Full commit-push-deploy pipeline. Runs verification, stages changes, writes a commit message, pushes to origin, and monitors the GitHub Actions deploy.

---

## Trigger

User types `/push` — start the pipeline immediately, no questions asked.

## Pipeline steps

Execute every step in order. Do not skip any step. If a step fails, stop and report the issue.

### Step 1: Status & diff

Run in parallel:

```bash
git status
```

```bash
git diff --stat
git diff --staged --stat
```

```bash
git log --oneline -5
```

If there are no changes (nothing modified, nothing untracked), report "Nothing to push" and stop.

### Step 2: Verification scan

Before staging anything, verify the changes are safe. Run these checks on all modified/new files:

**2a. Import check** — For every modified `.ts` / `.tsx` file, grep for import statements and confirm each imported local file exists with `Glob`.

**2b. Route check** — If any API route files were added/changed, confirm they have `export const dynamic = 'force-dynamic'`.

**2c. Translation check** — If any i18n keys were added, grep all 5 language files (`messages/{en,nl,de,fr,tr}.json`) to confirm the key exists in each.

**2d. Screen registry check** — If any BOP screen was added, confirm entries exist in:
- `lib/screen-registry.ts`
- `lib/bop/manifests/index.ts`
- `middleware.ts` ROLE_MODULES
- `components/Shell.tsx` NAV

**2e. Secrets scan** — Review `git diff` output for anything that looks like a password, API key, token, or secret. Check any `.env` files are in `.gitignore`. If anything suspicious is found, stop and warn the user.

If any check fails, report the issue and stop. Do not proceed to commit.

### Step 3: Stage files

Stage only the relevant files — never use `git add -A` or `git add .`

```bash
git add <specific-files>
```

Review what's staged:

```bash
git status
```

Confirm no unexpected files are included (node_modules, .env, build artifacts, .next/).

### Step 4: Commit

Write a commit message based on the actual diff. Follow these rules:
- First line: `type: short description` (feat/fix/refactor/chore/docs)
- Body: 2-4 bullet points explaining what changed and why
- End with attribution lines

```bash
git commit -m "$(cat <<'EOF'
type: short description

- bullet point 1
- bullet point 2

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
Claude-Session: <session-url>
EOF
)"
```

### Step 5: Push

```bash
git push -u origin main
```

If push fails due to network error, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s).

If push fails due to diverged history (remote has new commits), pull first:

```bash
git pull origin main --rebase
git push -u origin main
```

### Step 6: Deploy monitoring

After push succeeds, check if GitHub Actions deploy triggered:

Use the `mcp__github__actions_list` tool (load via ToolSearch if needed) to check the latest workflow run on `sunaysunay/dessystems-web`.

Report:
- Commit hash pushed
- Deploy workflow status (triggered / running / completed)
- Link to the workflow run if available

### Step 7: Summary

Print a final summary:

```
## Push complete

- Commit: `abc1234` — feat: description
- Files: 3 changed, 45 insertions, 12 deletions
- Branch: main → origin/main
- Deploy: GitHub Actions run #XX triggered
- Verification: all checks passed
```

## Error handling

| Error | Action |
|-------|--------|
| Nothing to commit | Report "Nothing to push" and stop |
| Verification failed | Report which check failed, show the issue, stop |
| Secrets detected | **STOP immediately**, warn user, do not commit |
| Push network error | Retry 4x with backoff, then report failure |
| Push rejected (diverged) | Pull --rebase, then push again |
| Deploy not triggered | Report it — user may need to check Actions config |

## What this skill does NOT do

- Does not create pull requests (use `/push` only for direct-to-main pushes)
- Does not run `promote.sh` (that's a VPS operation, separate from git push)
- Does not execute database migrations (those require explicit user confirmation per CLAUDE.md policy)
