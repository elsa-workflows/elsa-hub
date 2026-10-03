# AGENTS.md

Guidance for AI coding agents working in this repository.

## PR reviewers

- Before opening a PR, read `.github/reviewers.md` and request exactly one live advisory reviewer from the list once the PR is open. If it declines or skips, request another live one.
- The PR author (human or agent, including Codex) never reviews or approves its own PR.
- Advisory reviews never replace the merge gate: an independent Elsa 3 Code Review `APPROVE + HIGH @ <head sha>` plus green CI. Any push after the approval needs a re-review on the new head.
- Update `.github/reviewers.md` whenever a reviewer is added, removed, or runs out of credits.
