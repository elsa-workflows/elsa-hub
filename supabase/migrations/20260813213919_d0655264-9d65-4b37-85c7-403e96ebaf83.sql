REVOKE SELECT, INSERT ON
  public.audit_events, public.blog_post_likes, public.blog_post_views,
  public.conversations, public.credit_bundles, public.credit_ledger_entries,
  public.credit_lots, public.engagement_workspaces, public.invitations,
  public.invoices, public.lot_consumptions, public.messages,
  public.notification_preferences, public.notifications, public.orders,
  public.org_billing_profiles, public.organization_members, public.organizations,
  public.platform_admins, public.products, public.profiles,
  public.provider_customers, public.provider_integrations, public.provider_members,
  public.registry_grants, public.subscriptions, public.unsubscribe_tokens,
  public.weaver_documents, public.weaver_messages, public.weaver_rate_events,
  public.weaver_threads, public.work_digest_sends, public.work_log_attachments,
  public.work_logs, public.workspace_files, public.workspace_sessions
FROM anon;

REVOKE INSERT ON public.radar_locations, public.roadmap_snapshots FROM anon;