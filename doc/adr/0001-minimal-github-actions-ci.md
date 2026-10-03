# ADR-0001: Minimal GitHub Actions CI

**Status**: Accepted
**Date**: 2026-10-03
**Authors**: @xgueret

## Context

Quality gates (Prettier, ESLint, type checking) only ran through the local pre-commit hook, which
can be skipped with `git commit --no-verify` and never covered tests or the production build.
Nothing checked a pull request before it reached `main`.

The project is a static frontend (Vite + TypeScript + Three.js) with no backend, no database and no
hosting yet. The repository is private on a GitHub Free organization, which grants 2,000 Actions
minutes per month.

## Decision

Add a single workflow, `.github/workflows/ci.yml`, with one `quality` job that runs on every pull
request and on every push to `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm format:check`
3. `pnpm lint --max-warnings=0`
4. `pnpm typecheck`
5. `pnpm test`
6. `pnpm build`

The steps go from fastest to slowest so that a failure shows up early. The job also sets:

- `concurrency` with `cancel-in-progress`, so only the latest push on a ref is checked;
- `permissions: contents: read`, so the job token cannot write to the repository;
- `timeout-minutes: 10`, so a hung test cannot drain the minute quota.

CI must match local runs exactly:

- `package.json` pins `"packageManager": "pnpm@10.23.0"`, and `pnpm/action-setup` installs that
  version.
- The lockfile is frozen.
- `--max-warnings=0` matches the pre-commit ESLint hook.
- `.superpowers/` is listed in `.prettierignore`, because its nested `.gitignore` is invisible to
  Prettier and broke `format:check` locally.

The CI is kept deliberately minimal: no deployment, no Dependabot, no OpenSSF Scorecard and no
build matrix.

## Alternatives Considered

- **Split jobs (lint / test / build in parallel)**: runs faster overall, but each job repeats
  checkout and install, which costs more minutes for a codebase this small.
- **Node version matrix**: the app ships as a static bundle, so Node is only a build tool. One
  version (22, the local one) is enough.
- **Dependabot and Scorecard** (used in `ckad-dojo` and `lfcs-dojo`): useful, but they add PR noise
  and configuration. Left out until the project needs them.
- **Deploy job (GitHub Pages)**: there is no hosting target yet, and Pages on a private repository
  requires a paid plan.

## Consequences

- **Positive**: every PR shows a red or green status built from the same commands a developer runs
  locally. A skipped pre-commit hook is caught.
- **Positive**: a run takes about one to two minutes, well within the free quota.
- **Negative**: the CI only reports failures. It does not block a merge, see
  [ADR-0002](0002-advisory-ci-no-protection.md).
- **Negative**: dependency and action updates stay manual, see
  [ADR-0003](0003-pin-actions-by-major-tag.md).
