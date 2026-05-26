/**
 * Lightweight, vendor-agnostic analytics layer.
 *
 * Events are pushed to `window.dataLayer` (compatible with GTM / GA4 when wired
 * up later) and to a custom `lovable:analytics` window event so other tools
 * (Plausible, PostHog, internal dashboards) can subscribe without coupling.
 *
 * In development, events are also logged to the console for verification.
 *
 * Phase 5 of the engagement roadmap — no schema or backend changes required.
 */

export type AnalyticsEvent =
  // Hero / homepage
  | "hero_cta_click"
  | "hero_secondary_click"
  // Weaver
  | "weaver_open"
  | "weaver_close"
  // Newsletter
  | "newsletter_submit"
  | "newsletter_success"
  // Code samples
  | "code_copy"
  // Blog / content
  | "tag_click"
  | "related_post_click"
  | "next_step_click"
  // Quickstart
  | "quickstart_path_click";

export interface AnalyticsProps {
  [key: string]: string | number | boolean | null | undefined;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

const isDev = import.meta.env.DEV;

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    timestamp: Date.now(),
    path: window.location.pathname + window.location.search,
    ...props,
  };

  // GTM / GA4-compatible data layer.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  // Decoupled subscribers.
  try {
    window.dispatchEvent(new CustomEvent("lovable:analytics", { detail: payload }));
  } catch {
    /* no-op */
  }

  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, props);
  }
}
