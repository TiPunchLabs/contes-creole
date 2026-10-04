# ADR-0002: Advisory CI Without Branch Protection

**Status**: Accepted
**Date**: 2026-10-03
**Authors**: @xgueret

## Context

The natural complement to [ADR-0001](0001-minimal-github-actions-ci.md) is to make the `quality`
check required on `main`, with a mandatory PR and no force-push or deletion.

The TiPunchLabs organization is on GitHub Free (`gh api orgs/TiPunchLabs --jq .plan.name` returns
`free`). For a private repository on that plan, both the branch protection API and the rulesets API
return HTTP 403: "Upgrade to GitHub Pro or make this repository public". A
`github_branch_protection` or `github_repository_ruleset` resource in the Terraform setup
(`~/Workspace/02-infrastructure/contes-creole/`) would fail at apply time.

## Decision

The CI is **advisory**. It reports a status on every PR and on `main`, but GitHub does not enforce
it. Merging a red PR is technically possible. By convention, it is never done.

This ADR is revisited if one of these changes:

- the repository becomes public;
- the organization moves to the Team plan;
- a local guard (for example a pre-commit hook that rejects commits on `main`) is adopted.

Any of these would make it possible to protect the branch. The planned settings are: require a PR
(0 approvals), block force-push and deletion, and require the `quality` check.

## Alternatives Considered

- **Make the repository public**: unlocks protection and free Pages, but publishes unreleased tales
  and work in progress. Not decided yet.
- **Upgrade to GitHub Team**: unlocks protection on private repositories, but it is a recurring
  cost for a single-maintainer project.
- **Local hook against commits on `main`**: free, but it only protects one machine and can be
  bypassed with `--no-verify`.

## Consequences

- **Positive**: no cost and no change of visibility. The CI still gives a reliable signal.
- **Negative**: enforcement depends on discipline. A broken `main` is possible after a hurried
  merge.
- **Negative**: the GitHub UI shows no "required" badge, so a failing check is easy to overlook.
