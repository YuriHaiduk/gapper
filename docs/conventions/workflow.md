# Workflow

How work is organized across Claude Code sessions. Every session follows this protocol.

## Folders

```
work/
  active/<NNN-slug>/     # the spec currently being implemented (normally exactly one)
    brief.md             # original requirements as given by the owner (read-only)
    plan.md              # ordered step checklist — the single progress tracker
    step-NN-<slug>.md    # detailed plan + log for one step, created when the step starts
  archive/<NNN-slug>/    # specs whose plan.md is fully done (moved here as a whole)
```

- `NNN` is a zero-padded sequence number across all specs (`001`, `002`, …).
- A new feature/epic after the MVP gets a new folder `work/active/002-<slug>/` with its own `brief.md` + `plan.md`.
- `docs/SPEC.md` is the product source of truth; `work/` only tracks *how and when* it is implemented.

## Session protocol

1. **Orient.** Read `CLAUDE.md`, then the active `plan.md`, then the `docs/SPEC.md` sections relevant to the next step. Check `git status` and `git log -5`.
2. **Pick the step.** Take the first step in `plan.md` that is not `[x]`. Do one step per session unless the owner says otherwise. If a step file already exists and is `in progress`, resume it.
3. **Plan the step.** Create `step-NN-<slug>.md` from the template below. Keep it short and concrete. If the step is non-trivial, show the plan to the owner before writing code.
4. **User actions.** If the step needs something only the owner can do (create a Supabase project, paste keys into `.env`, create a GitHub repo, set secrets, enable Pages, test on a real iPhone), list exact instructions in the step file under *User actions*, tell the owner, and **wait**. Never invent credentials or skip the action.
5. **Implement.** Follow `docs/conventions/*`. Stay inside the step's scope; note discovered follow-ups in `plan.md` → *Backlog* instead of doing them.
6. **Verify.** Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (once they exist) and any step-specific checks. Record results in the step file.
7. **Close.** Mark tasks in the step file, set its status to `done`, tick the step in `plan.md`, update `docs/SPEC.md` / `docs/decisions.md` if behavior or architecture changed, then commit (see `git.md`).
8. **Archive.** When every step in `plan.md` is `[x]`, move the whole folder to `work/archive/`.

## When to ask the owner

Ask (and wait) when:
- a product decision is not covered by `docs/SPEC.md`;
- the step would change behavior described in `SPEC.md`;
- a new runtime dependency is not already listed in `SPEC.md` §20;
- credentials, accounts, dashboards, or a physical device are needed;
- something destructive is about to happen (deleting data, rewriting history, force-push).

Do not ask about things with an obvious conventional default — pick it, and mention it.

## Step file template

```markdown
# Step NN — <title>

Status: planned | in progress | blocked (waiting for owner) | done
Spec: docs/SPEC.md §<sections>

## Goal
One or two sentences.

## Scope
- In: …
- Out: …

## User actions
- [ ] Exact instruction for the owner (or "None").

## Tasks
- [ ] …

## Files
- `src/...` — what changes

## Verification
- [ ] npm run lint / typecheck / test / build
- [ ] Manual check: …

## Notes / decisions
- Anything decided during the step (also copied to docs/decisions.md if architectural).
```

## plan.md conventions

- Each step line: `- [ ] **NN. Title** — one-line summary → [step file](step-NN-slug.md)` (link added when the file exists).
- Steps that need the owner are marked `👤`.
- Status markers: `[ ]` todo, `[~]` in progress, `[x]` done.
- Sections: *Steps*, *Backlog* (found during work, not yet scheduled), *Open questions*.
