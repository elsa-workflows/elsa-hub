// Public endpoint hit from the verification email link.
// Validates the token, marks the submission as verified, promotes it to
// the admin review queue (status = 'pending'), and notifies platform admins.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = "https://elsa-workflows.io";

function htmlPage(opts: { title: string; heading: string; body: string; cta?: { href: string; label: string } }) {
  const cta = opts.cta
    ? `<a href="${opts.cta.href}" style="display:inline-block;margin-top:24px;padding:12px 22px;background:#e11d74;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">${opts.cta.label}</a>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${opts.title}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#e5e7eb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
<div style="max-width:520px;width:100%;background:#11131a;border:1px solid #1f2937;border-radius:14px;padding:36px;text-align:center">
<h1 style="margin:0 0 12px;font-size:22px;color:#f9fafb">${opts.heading}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#9ca3af">${opts.body}</p>
${cta}
</div></body></html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || token.length < 16) {
    return new Response(
      htmlPage({
        title: "Invalid link",
        heading: "Invalid verification link",
        body: "The link you used is malformed. Please use the verification link from your email.",
      }),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error } = await admin
    .from("radar_locations")
    .select(
      "id, status, verification_token_expires_at, company_name, city, country, region, anonymous, submitted_contact_email",
    )
    .eq("verification_token", token)
    .maybeSingle();

  if (error) {
    console.error("Lookup failed", error);
    return new Response(
      htmlPage({
        title: "Verification error",
        heading: "Something went wrong",
        body: "We couldn't process this verification right now. Please try again in a moment.",
      }),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  if (!row) {
    return new Response(
      htmlPage({
        title: "Link expired",
        heading: "This link is no longer valid",
        body: "It may have already been used or the submission was withdrawn.",
        cta: { href: `${SITE_URL}/community/radar`, label: "Back to the radar" },
      }),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  if (row.status === "pending" || row.status === "approved") {
    return new Response(
      htmlPage({
        title: "Already verified",
        heading: "Already verified",
        body: row.status === "approved"
          ? "Your submission is live on the radar."
          : "Thanks — your submission is already with our review team.",
        cta: { href: `${SITE_URL}/community/radar`, label: "Open the radar" },
      }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  if (row.status === "rejected") {
    return new Response(
      htmlPage({
        title: "Submission closed",
        heading: "This submission is closed",
        body: "Our team already reviewed this entry. Reach out if you'd like to discuss.",
      }),
      { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const expiresAt = row.verification_token_expires_at
    ? new Date(row.verification_token_expires_at).getTime()
    : 0;
  if (!expiresAt || expiresAt < Date.now()) {
    return new Response(
      htmlPage({
        title: "Link expired",
        heading: "Your verification link has expired",
        body: "Please submit again from the radar page — links are valid for 7 days.",
        cta: { href: `${SITE_URL}/community/radar`, label: "Submit again" },
      }),
      { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Promote to admin review queue and clear the token.
  const { error: updErr } = await admin
    .from("radar_locations")
    .update({
      status: "pending",
      verified_at: new Date().toISOString(),
      verification_token: null,
      verification_token_expires_at: null,
    })
    .eq("id", row.id);

  if (updErr) {
    console.error("Verification update failed", updErr);
    return new Response(
      htmlPage({
        title: "Verification error",
        heading: "Something went wrong",
        body: "We couldn't confirm your submission. Please try the link again or resubmit.",
      }),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Notify platform admins now that the submitter has verified ownership.
  try {
    const { data: admins } = await admin.from("platform_admins").select("user_id");
    if (admins?.length) {
      const summary = row.anonymous
        ? `${row.city}, ${row.country} (anonymous)`
        : `${row.company_name ?? "Unknown"} — ${row.city}, ${row.country}`;
      const rows = admins.map((a) => ({
        user_id: a.user_id,
        type: "radar_submission",
        title: "New radar submission",
        message: summary,
        action_url: "/dashboard/admin/radar",
        payload: {
          submission_id: row.id,
          city: row.city,
          country: row.country,
          region: row.region,
          contact_email: row.submitted_contact_email,
        },
      }));
      await admin.from("notifications").insert(rows);
    }
  } catch (e) {
    console.error("Admin notify failed (non-fatal)", e);
  }

  return new Response(
    htmlPage({
      title: "Email verified",
      heading: "Thanks — you're verified",
      body: "Your submission is now with our review team. We'll publish it on the radar shortly.",
      cta: { href: `${SITE_URL}/community/radar`, label: "Open the radar" },
    }),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
});
