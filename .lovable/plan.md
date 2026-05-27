
# Engagement Workspace

A persistent collaboration space scoped to each `provider_customers` pair (one Org ↔ one Provider). Both sides land in the same workspace and see the same files, notes, decisions, and action items. The existing Messaging thread and Work Logs are linked in but stay where they are.

## What gets built

### 1. Files tab (shared file library)
- Folder tree (optional, flat is fine for v1) of files uploaded by either side.
- Drag-and-drop upload, multi-select.
- Per file: who uploaded, when, size, type, optional description, link to related work log (if any).
- Preview for PDF / images / text / markdown / VTT / SRT. Download for everything else.
- File-level threaded comments.
- **Defaults (since none were specified):** 50 MB per file, 2 GB per engagement; allow `pdf, md, txt, docx, xlsx, csv, png, jpg, webp, mp3, mp4, m4a, wav, vtt, srt, json, zip`; block executables.

### 2. Notes tab (shared markdown docs)
- Lightweight markdown documents (think "meeting notes", "scope", "credentials checklist").
- Last-writer-wins for v1, with `updated_by` + `updated_at` shown. (Realtime CRDT not in scope.)
- Pinned notes at the top.

### 3. Decisions tab (append-only log)
- One-line decisions with date, author, optional context paragraph.
- Cannot be edited after 24h; can be marked "superseded by …".
- Easy to scan months later — the historical record of "what we agreed to".

### 4. Action items tab
- Title, optional description, assignee (any org or provider member), due date, status (open / in progress / done / cancelled).
- Linkable to a work log, a file, or a note.
- Notifications on assign, due-soon, and completion (reuses notifications + email infra).

### 5. Work log integration
- Attach files from the workspace to a work log (linking, not duplicating).
- Quick "Add to workspace Files" toggle when uploading from the Log Work dialog.
- Work logs show their linked files; workspace Files show which work log (if any) they're attached to.

### 6. AI transcript summarization (Lovable AI Gateway)
- On any uploaded file that looks like a transcript (`.vtt`, `.srt`, `.txt`, `.md` over a size threshold, or user-flagged), show a **"Summarize + extract actions"** button.
- Calls a new edge function `summarize-transcript` that:
  1. Reads the file from Storage.
  2. Sends to `google/gemini-3-flash-preview` with a structured-output schema: `{ summary, key_points[], action_items[{title, owner_hint, due_hint}], suggested_category, suggested_minutes }`.
  3. Returns the JSON to the client.
- The client opens the **Log Work** dialog pre-filled with the summary, suggested minutes, and category. Extracted action items are pre-checked for creation in the Action Items tab.
- The transcript file is automatically attached to the resulting work log.

### 7. Workspace home
- Activity stream: recent files, notes edited, decisions logged, actions completed, work logs.
- Quick stats: open actions, files this month, hours logged this month, credits remaining.

## Navigation

- Org side: `dashboard/org/:slug/workspace/:providerSlug` with tabs `Overview / Files / Notes / Decisions / Actions`. Messages stays in its current tab and links over.
- Provider side: `dashboard/provider/:slug/workspace/:orgSlug` with the same tabs.
- A new "Workspace" item appears in both sidebars (conditional on having at least one counterparty).

## Technical details

### Database (new)
- `engagement_workspaces` — one row per `(organization_id, service_provider_id)` pair. Acts as the parent for all workspace content.
- `workspace_files` — `workspace_id, storage_path, file_name, mime_type, size_bytes, uploaded_by, description, related_work_log_id (nullable)`.
- `workspace_file_comments` — threaded comments on files.
- `workspace_notes` — `workspace_id, title, body_markdown, pinned, created_by, updated_by`.
- `workspace_decisions` — append-only; `workspace_id, summary, context, decided_by, superseded_by (nullable)`.
- `workspace_action_items` — `workspace_id, title, description, assignee_user_id, due_at, status, related_work_log_id, related_file_id, related_note_id`.
- `work_log_attachments` — link table: `work_log_id, file_id` (file lives in `workspace_files`).
- All tables: `created_at`, `updated_at`, full GRANTs for `authenticated` + `service_role`, RLS enabled.

### RLS pattern
Reuse existing helpers. A new `is_engagement_member(p_workspace_id uuid)` security-definer function returns true if the caller is an org member of the workspace's org **or** a provider member of the workspace's provider. All workspace child tables policy off this single function.

Actions inserts/updates additionally require the caller to be a member of the assigner/assignee's side or the assignee themselves.

### Storage
- New private bucket `engagement-files`.
- Path convention: `{workspace_id}/{uuid}-{filename}`.
- Storage RLS: read/insert/delete allowed when `is_engagement_member((storage.foldername(name))[1]::uuid)`.

### Edge functions
- `summarize-transcript` — auth required; verifies caller is an engagement member of the file's workspace; downloads file via service role; calls Lovable AI Gateway with JSON schema; returns structured result. No persistence — the client decides what to save.
- `create-engagement-workspace` is **not** needed; workspaces auto-create the first time either side opens the route (RPC `get_or_create_engagement_workspace(p_org_id, p_provider_id)` mirroring the existing `get_or_create_conversation` pattern).

### Notifications
Extend the existing notifications enum / preferences with: `notify_action_assigned`, `notify_action_due_soon`, `notify_workspace_file_added`, `notify_workspace_note_updated`. Email templates follow the existing Resend setup.

### Frontend
- New folder `src/components/workspace/` for `FilesTab`, `NotesTab`, `DecisionsTab`, `ActionsTab`, `OverviewTab`, `FileUploader`, `FilePreview`, `TranscriptSummarizeButton`, `ActionItemDialog`, `NoteEditor`.
- New hooks: `useEngagementWorkspace`, `useWorkspaceFiles`, `useWorkspaceNotes`, `useWorkspaceDecisions`, `useWorkspaceActions`.
- New pages: `src/pages/dashboard/org/OrgWorkspace.tsx`, `src/pages/dashboard/provider/ProviderWorkspace.tsx`, each rendering a shared `<EngagementWorkspace />` component.
- Extend `LogWorkDialog` to: (a) accept a pre-fill payload from transcript summarization, (b) show a "Attach files" picker drawing from the workspace's Files tab.

## Build order (one slice at a time so you can ship incrementally)

1. **Foundations** — migrations for `engagement_workspaces` + `is_engagement_member` + `get_or_create_engagement_workspace` RPC. Sidebar entry + empty workspace shell with tabs.
2. **Files tab** — bucket, table, upload, list, preview, download, delete. Work log "Attach from workspace" picker.
3. **AI transcript summarization** — edge function + button on transcript-like files + pre-fill of Log Work dialog.
4. **Action items** — table, CRUD UI, notifications.
5. **Notes** — table, simple markdown editor (reuse existing markdown renderer), pin/unpin.
6. **Decisions** — append-only log with supersede.
7. **Overview tab** — activity stream + stats.
8. **File comments** — threaded comments on individual files.

Each step is independently shippable. You can stop after step 3 and already have the transcript-driven flow you originally asked for.

## Explicit non-goals (v1)

- No realtime collaborative editing (Yjs / CRDT). Last-writer-wins.
- No video transcription pipeline — we accept transcripts the user already has (Teams, Zoom, Otter, etc.).
- No per-file permissions; everything in a workspace is visible to all members of that org and that provider.
- No external sharing links — workspace stays inside the platform.
