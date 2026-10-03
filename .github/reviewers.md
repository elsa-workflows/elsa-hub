# PR reviewers and merge gate

Live list of automated reviewers for this repository (elsa-hub), plus the merge gate. Agents read it before opening a PR.

Last verified: 2026-10-03

| Reviewer | Status | How to request | Notes |
| --- | --- | --- | --- |
| GitHub Copilot code review (`copilot-pull-request-reviewer[bot]`) | not live | Add reviewer `@copilot`: `gh pr edit <n> --add-reviewer @copilot` (GitHub CLI 2.88 or later), once enabled for this repository | Not enabled for this repository: a request does not register here, and the ruleset "Code Quality Copilot review for default branch" is disabled. It works on elsa-workflows/elsa-extensions only (elsa-extensions#272). It becomes live once Copilot review is enabled for elsa-hub and a review actually lands on an elsa-hub PR. A `@copilot review` comment does not trigger it. |
| Greptile (`greptile-apps[bot]`) | not live | Automatic when a PR is opened; comment `@greptileai` after every push (once enabled for this repository) | Not enabled for this repository: it has not reviewed or commented on any elsa-hub PR. |
| CodeRabbit (`coderabbitai[bot]`) | not live | Automatic on PRs into `main`; comment `@coderabbitai review` for other base branches or a re-review after a push (once enabled for this repository) | Not enabled for this repository: the org app is installed for selected repositories only and has not reviewed any elsa-hub PR. |
| Cursor Bugbot | not live | Top-level PR comment `cursor review` (once enabled) | Must first be enabled in the Cursor dashboard. `cursor[bot]` comments on PRs come from Cursor cloud agents, not Bugbot. |
| GitHub Code Quality (`github-code-quality[bot]`) | not live | Automatic; cannot be requested | CodeQL code-quality comments. Not an advisory pick and not part of the merge gate. No activity on this repository so far. |

## Rules

- Request exactly one live advisory reviewer from the table right after opening the PR.
- If that reviewer declines or skips the PR, request another live reviewer from the table instead. If none is left, say so in the PR description.
- If no reviewer in the table is live (the case today), skip the advisory request and say so in the PR description. The merge gate is unchanged.
- The PR author (human or agent, including Codex) never reviews or approves its own PR.
- Merge gate: an independent Elsa 3 Code Review `APPROVE + HIGH @ <head sha>` (the full 40-character SHA of the PR's current head commit) and green CI. Any push after the approval needs a re-review and re-confirm on the new head.
- Green CI on elsa-hub currently means these checks: CodeQL (`Analyze (javascript-typescript)`), `GitGuardian Security Checks` and `license/cla`. The repository has no build or test workflow.
- Advisory reviews never replace the merge gate.
- `main` has no branch protection, and Lovable commits straight to `main`. The merge gate therefore covers PRs only, by convention.
- Update this file whenever a reviewer is added, removed, runs out of credits, or changes how it is requested.

## Evidence (elsa-hub PRs #1 to #11, checked 2026-10-03)

- GitHub Copilot code review: its only elsa-hub review is on #1 (2026-01-26), which the Copilot coding agent opened; Copilot was added as a reviewer at merge time and the review landed after the merge. On #10 (opened 2026-10-03) a request via `gh pr edit 10 --add-reviewer @copilot` and via the REST API returned success but never registered: no `review_requested` event, no requested reviewers, no review. The ruleset "Code Quality Copilot review for default branch" is disabled. The same account's request registered on elsa-extensions#272 (2026-10-03), so this is specific to elsa-hub.
- Greptile: no reviews, comments or "Greptile Review" check on #1 to #11, including #9, #10 and #11 (opened 2026-10-03, after the org app was last updated on 2026-10-01).
- CodeRabbit: no reviews or comments on #1 to #11. #9, #10 and #11 were opened 2026-10-03 into `main`, after the org app was installed that day, and got no automatic review, so this repository is not in its selection.
- Cursor Bugbot: no activity on #1 to #11.
- GitHub Code Quality: no activity on #1 to #11.
