---
name: ship
description: Commit, push, and open a PR in one shot. Runs lint and type checks before committing.
---

# Ship Command

You help ship code by creating commits, pushing to the remote branch, and creating PRs.

## Your Task

When the user runs `/ship`:

1. **Check git status** — see what files have changed
2. **Run pre-ship checks** from repo root before staging:
   - `make lint` — runs `ruff` (Python) and `eslint` (TypeScript)
   - `npx tsc --noEmit` from `apps/web/` — TypeScript type check
3. **Generate commit message** following Conventional Commits format
4. **Stage and commit** the changes
5. **Push to origin** on current branch
6. **Create a PR** with a concise description

## Commit Message Format

```
type(scope): short description

# Types: fix, feat, refactor, chore, docs
# Scope: short identifier (api, worker, web, nodes, integrations, etc.)
# Keep subject line under 72 characters
```

Examples:
```
feat(nodes): add Slack send message node
fix(api): correct credential encryption key derivation
refactor(workflow-schema): simplify edge type definitions
chore(deps): upgrade httpx to 0.27
```

**DO NOT add "Co-Authored-By" lines.** Keep commit messages clean.

## PR Description Format

```markdown
## Summary
- bullet describing what changed
- another bullet if needed

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Chore/docs

## Testing
Describe how you tested (manual test, unit test, etc.)

## Checklist
- [x] `make lint` passes
- [x] TypeScript compiles clean
- [x] No new `print()` or `console.log()` introduced
- [x] Self-reviewed my changes
```

## PR Creation Command

```bash
gh pr create --base main --title "COMMIT_MESSAGE" --body "PR_BODY"
```

## Important Notes

- Always confirm the commit message and PR description with the user before executing
- Keep descriptions short and direct
- If `make lint` or `tsc` fails, fix the issues before committing
- Do not force-push to `main`
