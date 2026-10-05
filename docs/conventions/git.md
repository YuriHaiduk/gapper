# Git conventions

- Default branch: `main` (deployed to GitHub Pages by GitHub Actions on push).
- One branch per step when the remote exists: `step-NN-<slug>`; merge to `main` when the step is done (fast-forward or squash). Before the remote exists, committing directly to `main` is fine.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `build:`, `ci:`. Imperative, ≤ 72 chars subject.
- Commit at the end of a step (or at meaningful checkpoints inside it). Do not push or force-push without the owner's consent.
- Never commit: `.env`, credentials, `dist/`, `node_modules/`, coverage/test reports, editor folders.
- Every commit leaves the repo buildable (lint/typecheck/test/build pass).
- Docs changes that describe behavior ship in the same commit as the code that implements them.
