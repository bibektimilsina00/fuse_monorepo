---
name: fix-properly
description: Forces architectural diagnosis before any fix. Blocks patches, workarounds, and lazy casts. Finds the root cause and fixes it at the source. Invoke when something is broken and you want the correct fix, not just the fast one.
user-invocable: false
---

# fix-properly skill

You are in root-cause mode. Every rule below is mandatory. No exceptions.

---

## Rule 1: Diagnose before touching anything

Before writing a single line of code, answer all of these out loud:

1. **What is the symptom?** (the error / wrong behavior the user sees)
2. **Where does the symptom surface?** (file and line that throws/fails)
3. **What is the actual root cause?** (the upstream source of the wrong data, wrong type, wrong assumption)
4. **How far upstream is the root cause from the symptom?** (same file? different layer? different package?)
5. **What is the correct fix at the root?**
6. **What would a lazy/patch fix look like?** (name it explicitly so you can reject it)

Do not proceed until all six are answered.

---

## Rule 2: Fix at the source, never at the consumer

The fix lives at **the point where the wrong thing is produced**, not where it is consumed.

| Wrong approach (patch) | Right approach (root fix) |
|---|---|
| Cast the value to make the consumer happy | Fix the type/value where it is produced |
| Add a special-case `if` for one caller | Fix the contract so all callers get correct data |
| Wrap a bad function call to suppress its error | Fix the function itself |
| Add a fallback default to hide a missing value | Fix why the value is missing |
| Rename a variable to avoid a collision | Fix the naming at the source |
| Add `# type: ignore` or `as any` | Fix the actual type mismatch |
| Duplicate logic to avoid touching the original | Refactor the original |
| Add a node-type check (`if node.type === 'X'`) | Fix the abstraction so the type check is never needed |

If your proposed change matches any row in the left column — stop. Go upstream.

---

## Rule 3: Trace the data flow before changing anything

For every bug, trace the value/behavior from origin to symptom:

```
[Where value is created]
       ↓
[Where value is transformed / stored]
       ↓
[Where value is read]
       ↓
[Where symptom appears]   ← DO NOT fix here
```

The fix belongs at the top of this chain, not the bottom.

---

## Rule 4: Reject these patterns unconditionally

Never produce any of the following:

- **Type casts to silence errors** — `as any`, `as string`, `str(uuid_field)`, `int(str_field)`, `// @ts-ignore`, `# type: ignore`
- **Defensive null checks that hide a bug** — `if value is None: return` when the value should never be None
- **Conditional node-type coupling** — `if node.type === 'condition'` or `if isinstance(node, ConditionNode)` inside generic code
- **Silenced exceptions** — `try: ... except: pass` to make an error go away
- **Duplicated logic** — copying a function/block instead of fixing the shared one
- **Inline workarounds** — adding special handling in one call site instead of fixing the shared abstraction
- **Schema mismatches papered over** — changing a serializer/deserializer to hide a model inconsistency instead of fixing the model

If you catch yourself about to write any of these, stop and re-diagnose.

---

## Rule 5: Check for ripple effects

Once you identify the root fix:

1. **Who else depends on the thing you're fixing?** Search for all usages.
2. **Will fixing the source break any consumers?** List them.
3. **Fix all consumers correctly**, not by patching them — by updating them to use the now-correct contract.

A root fix that breaks three other places and you patch those three places is not a root fix.

---

## Rule 6: Validate the fix is complete

After applying the fix, confirm:

- [ ] The symptom is gone
- [ ] No `as any`, `# type: ignore`, or equivalent was added anywhere
- [ ] No new special-case conditions were added for the broken thing
- [ ] All consumers of the fixed thing still work with the correct contract
- [ ] TypeScript / Pyright / ruff reports no new errors
- [ ] The fix makes sense to someone reading only the changed files — no context needed from the bug report

---

## What to say to the user

Before implementing, state:

```
Root cause: <one sentence — what is actually wrong and where>
Lazy fix (rejected): <what a patch would look like>
Correct fix: <what you will actually do and where>
Ripple effects: <other files that need updating>
```

Then implement. Never implement without saying this first.
