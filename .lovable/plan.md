## Goal

When work is logged for a customer during the day, send that organization's members a single end-of-day digest email summarizing the hours. Skip days with no activity. Respect existing notification preferences.

## Approach

Reuse the existing Resend + `buildEmailTemplate` + `notification_preferences` stack. Add one scheduled edge function and one small preference flag. No changes to how work is logged. The existing per-entry `work_logged` in-app notification stays; only the noisy per-entry email path is complemented (and, per user intent, effectively replaced for digest-subscribed users — see Decision below).

## Changes

### 1. Preferences (migration)
- Add column `notify_work_digest boolean NOT NULL DEFAULT true` to `notification_preferences`.
- Extend `useNotificationPreferences` typing + `NotificationSettings.tsx` UI: new toggle "Daily work summary email" grouped with existing work notification setting.
- Extend `emailTemplate.ts` `unsubscribeType` union with `"work_digest"` and handle it in `unsubscribe` edge function + `notification_preferences` mapping.

### 2. New edge function `send-work-digest`
- `verify_jwt = false`, invoked by pg_cron (auth via `WORK_DIGEST_CRON_SECRET` header, mirroring existing `WEAVER_INGEST_CRON_SECRET` pattern).
- Accepts optional `{ date?: "YYYY-MM-DD", tz?: "UTC" }`; defaults to yesterday UTC.
- Logic:
  1. Query `work_logs` grouped by `organization_id, service_provider_id` where `performed_at` falls in the target day AND `created_at` also falls in it (so back-dated entries logged today still get included on "today's" digest — see Decision).
  2. For each `(org, provider)` group with ≥1 entry: load provider name, org members, and each member's `notification_preferences`.
  3. For each member where `email_enabled AND notify_work_digest`: send one email using `buildEmailTemplate` with subject `"Today's work summary — {providerName}"`, a small table (date, category, hours, description truncated) and totals, CTA to `…/dashboard/org/{slug}/workspaces/{providerSlug}`.
  4. Idempotency: insert a row into a new `work_digest_sends(organization_id, service_provider_id, digest_date, user_id, sent_at)` table with a unique index on `(organization_id, service_provider_id, digest_date, user_id)`; skip already-sent rows. Prevents duplicate sends if cron retries.

### 3. Scheduling (SQL via supabase insert tool, not migration — contains anon key)
- Enable `pg_cron`, `pg_net`.
- Schedule `send-work-digest` daily at 18:00 UTC (end of European workday; acceptable default, easy to change later).

### 4. Decision to confirm with user
- **Turn off the existing immediate per-entry `send-work-notification` email?** Currently every logged entry pings org members via `create-notification` (in-app + probably email through `send-notification`). If the digest is the goal, we should keep the in-app notification but suppress the per-entry *email* for users who have `notify_work_digest` on. Proposed: yes, suppress per-entry email when digest is enabled; users who disable digest still get per-entry emails (via existing `notify_work_logged`).

## Technical notes

- Idempotency table + unique index avoid duplicate emails on retries or manual re-runs.
- "No activity ⇒ no email" is enforced by grouping on actual `work_logs` rows — the function simply produces zero sends when the query returns nothing.
- Timezone: v1 uses UTC day boundaries; per-org timezone can be added later without schema changes (add nullable `timezone` to `organizations` and read it in the grouping query).
- All new SQL for the new table follows the required GRANT + RLS structure; only `service_role` needs access.

## Out of scope
- Per-user timezone preferences.
- Weekly/monthly rollups.
- Provider-side digest (this is customer-facing only, matching the request).
- Any change to `create_work_log_and_allocate` RPC.

## Verification
- Toggle appears in Notification Settings and persists.
- Manually invoking `send-work-digest` with `?date=YYYY-MM-DD` for a day with logs sends one email per eligible member per (org, provider); second invocation sends nothing (idempotency).
- Invoking for a day with no logs sends nothing and writes no rows.
- Unsubscribe link with `type=work_digest` flips only `notify_work_digest` to false.
