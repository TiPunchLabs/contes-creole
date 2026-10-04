# ADR-0003: Pin GitHub Actions by Major Tag, Not by SHA

**Status**: Accepted
**Date**: 2026-10-03
**Authors**: @xgueret

## Context

A workflow can reference a third-party action in three ways:

- by moving major tag (`actions/checkout@v7`);
- by exact version (`@v7.0.1`);
- by full commit SHA (`@<40-hex-sha>  # v7.0.1`).

SHA pinning is the supply-chain best practice, because a tag can be moved to malicious code.
However, it only stays maintainable with an automated updater such as Dependabot or Renovate, which
[ADR-0001](0001-minimal-github-actions-ci.md) leaves out. Sibling TiPunchLabs repositories
(`byenvini`, `radar-tech-guadeloupe`) use major tags.

On 2026-10-03, the latest majors were `actions/checkout` v7, `actions/setup-node` v7 and
`pnpm/action-setup` v6. Their release notes showed no breaking change for this workflow. One
behavior matters: since setup-node v6, automatic caching only covers npm, so `cache: pnpm` must be
set explicitly.

## Decision

Reference every action by its **major tag**, and only use actions published by GitHub (`actions/*`)
or by the tool's own maintainers (`pnpm/*`). Before bumping a major version, read its release
notes.

## Alternatives Considered

- **SHA pinning**: strongest protection against a hijacked tag, but versions go stale silently
  without a bot. Revisit together with Dependabot.
- **Exact version tags**: they can be moved just like major tags, so they bring no real security
  gain, while losing the automatic patch updates of a major tag.

## Consequences

- **Positive**: patch and minor fixes of each action arrive without any edit. The workflow stays
  readable and consistent with the sibling repositories.
- **Negative**: the job trusts the maintainers of three actions not to move a tag to compromised
  code. This risk is limited by `permissions: contents: read` and by the absence of secrets in the
  job.
- **Negative**: new majors are only noticed by hand.
