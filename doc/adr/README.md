# Architecture Decision Records

> This directory contains Architecture Decision Records (ADR) for the contes-creole project.
> ADRs document significant architectural choices with their context, rationale, and consequences.

## Index

| ADR                                           | Title                                       | Status   | Date       |
| --------------------------------------------- | ------------------------------------------- | -------- | ---------- |
| [ADR-0001](0001-minimal-github-actions-ci.md) | Minimal GitHub Actions CI                   | Accepted | 2026-10-03 |
| [ADR-0002](0002-advisory-ci-no-protection.md) | Advisory CI without branch protection       | Accepted | 2026-10-03 |
| [ADR-0003](0003-pin-actions-by-major-tag.md)  | Pin GitHub Actions by major tag, not by SHA | Accepted | 2026-10-03 |

## Statuses

- **Proposed** — Under discussion, not yet decided
- **Accepted** — Decision adopted and in effect
- **Superseded** — Replaced by a newer ADR (linked)
- **Deprecated** — No longer relevant but kept for history

## Template

New ADRs should follow this format:

```markdown
# ADR-NNNN: Title

**Status**: Proposed | Accepted | Superseded by [ADR-XXXX](XXXX-title.md) | Deprecated
**Date**: YYYY-MM-DD
**Authors**: @username

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Alternatives Considered

What other options were evaluated and why were they rejected?

## Consequences

What becomes easier or more difficult to do because of this change?
```

## Conventions

- ADRs are numbered sequentially: `NNNN-short-title.md`
- Once accepted, an ADR is **immutable** — create a new one to supersede it
- Reference ADRs in PRs, specs, and conversations using `ADR-NNNN`
