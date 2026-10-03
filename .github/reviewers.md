# Advisory PR reviewers

Live list of automated reviewers for this repository (elsa-hub). Agents read it before opening a PR.

Last verified: 2026-10-03

| Reviewer | Status | How to request | Notes |
| --- | --- | --- | --- |
| GitHub Copilot code review (`copilot-pull-request-reviewer[bot]`) | live | Add reviewer `@copilot`: `gh pr edit <n> --add-reviewer @copilot` (GitHub CLI 2.88 or later) | Advisory. A `@copilot review` comment does not trigger it. Bot-authored PRs need the org policy that lets Copilot review them. |
| Greptile (`greptile-apps[bot]`) | not live | Automatic when a PR is opened; comment `@greptileai` after every push (once enabled for this repository) | Not enabled for this repository: it has not reviewed or commented on any elsa-hub PR. |
| CodeRabbit (`coderabbitai[bot]`) | not live | Automatic on PRs into `main`; comment `@coderabbitai review` for other base branches or a re-review after a push (once enabled for this repository) | Not enabled for this repository: the org app is installed for selected repositories only and has not reviewed any elsa-hub PR. |
| Cursor Bugbot | not live | Top-level PR comment `cursor review` (once enabled) | Must first be enabled in the Cursor dashboard. `cursor[bot]` comments on PRs come from Cursor cloud agents, not Bugbot. |
| GitHub Code Quality (`github-code-quality[bot]`) | not live | Automatic; cannot be requested | CodeQL code-quality comments. Not an advisory pick and not part of the merge gate. No activity on this repository so far. |

## Rules

- Request exactly one live advisory reviewer from the table (today that is GitHub Copilot code review) right after opening the PR.
- If that reviewer declines or skips the PR, request another live reviewer from the table instead.
- The PR author (human or agent, including Codex) never reviews or approves its own PR.
- Merge gate: an independent Elsa 3 Code Review `APPROVE + HIGH @ <head sha>` (the full 40-character SHA of the PR's current head commit) and green CI. Any push after the approval needs a re-review and re-confirm on the new head.
- Advisory reviews never replace the merge gate.
- Update this file whenever a reviewer is added, removed, runs out of credits, or changes how it is requested.

## Evidence (elsa-hub PRs #1 to #9, checked 2026-10-03)

- GitHub Copilot code review: last review on #1 (2026-01-26, requested by adding `@copilot` as reviewer). Confirmed working org-wide on elsa-workflows/elsa-extensions#272 (2026-10-03).
- Greptile: no reviews, comments or "Greptile Review" check on #1 to #9, including #9 (opened 2026-10-03, after the org app was last updated on 2026-10-01).
- CodeRabbit: no reviews or comments on #1 to #9, including #9 (opened 2026-10-03 into `main`, after the org app was installed on 2026-10-03), so this repository is not in its selection.
- Cursor Bugbot: no activity on #1 to #9.
- GitHub Code Quality: no activity on #1 to #9.
