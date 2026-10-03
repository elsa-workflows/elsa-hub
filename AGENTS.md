# AGENTS.md

Guidance for AI coding agents working in this repository.

## PR reviewers

- Before opening a PR, read `.github/reviewers.md` and request exactly one live advisory reviewer from the list once the PR is open. If it declines or skips, request another live one.
- If no reviewer in the list is live (the case today), skip the advisory request and say so in the PR description. The merge gate still applies.
- The PR author (human or agent, including Codex) never reviews or approves its own PR.
- Advisory reviews never replace the merge gate: an independent Elsa 3 Code Review `APPROVE + HIGH @ <head sha>` (the full 40-character SHA of the PR's current head commit) plus green CI (CodeQL, GitGuardian and license/cla). Any push after the approval needs a re-review on the new head.
- `main` has no branch protection and Lovable commits straight to `main`, so the gate covers PRs only, by convention.
- Update `.github/reviewers.md` whenever a reviewer is added, removed, runs out of credits, or changes how it is requested.
