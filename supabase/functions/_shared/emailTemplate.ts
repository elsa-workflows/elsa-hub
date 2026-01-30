// Shared email template builder for all transactional emails

export interface EmailTemplateOptions {
  preheader?: string;        // Preview text in email clients
  title: string;
  content: string;           // HTML content
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeToken?: string;
  unsubscribeType?: "all" | "newsletter" | "work_logged" | "purchase" | "subscription";
  recipientEmail?: string;   // For RFC 8058 headers
}

export interface EmailWithHeaders {
  html: string;
  headers?: Record<string, string>;
}

const BASE_URL = "https://elsa-hub.lovable.app";
const LOGO_URL = `${BASE_URL}/elsa-logo.png`;

export function buildEmailTemplate(options: EmailTemplateOptions): EmailWithHeaders {
  const {
    preheader,
    title,
    content,
    ctaText,
    ctaUrl,
    unsubscribeToken,
    unsubscribeType = "all",
  } = options;

  const preferencesUrl = `${BASE_URL}/dashboard/settings/notifications`;
  
  // Build unsubscribe URL if token provided
  const unsubscribeUrl = unsubscribeToken 
    ? `https://tehhrjepyfnhmsgtwzkf.supabase.co/functions/v1/unsubscribe?token=${unsubscribeToken}&type=${unsubscribeType}`
    : preferencesUrl;

  // RFC 8058 headers for one-click unsubscribe
  const headers: Record<string, string> = {};
  if (unsubscribeToken) {
    headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #1a1a2e !important; }
      .email-card { background-color: #2d2d44 !important; border-color: #3d3d5c !important; }
      .text-primary { color: #f4f4f5 !important; }
      .text-secondary { color: #a1a1aa !important; }
      .text-muted { color: #71717a !important; }
      .divider { border-color: #3d3d5c !important; }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; background-color: #f4f4f5; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden preview in email clients) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader || title}
    ${"&nbsp;".repeat(100)}
  </div>
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${BASE_URL}" target="_blank" style="display: inline-block;">
                <img src="${LOGO_URL}" 
                     alt="Elsa Workflows" 
                     width="56" height="56" 
                     style="display: block; border: 0; outline: none;">
              </a>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 40px 36px;">
                    
                    <!-- Title -->
                    <h1 class="text-primary" style="margin: 0 0 20px; font-size: 26px; font-weight: 700; color: #18181b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.3;">
                      ${title}
                    </h1>
                    
                    <!-- Content -->
                    <div class="text-secondary" style="color: #3f3f46; font-size: 16px; line-height: 1.7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      ${content}
                    </div>
                    
                    ${ctaText && ctaUrl ? `
                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px;">
                      <tr>
                        <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
                          <a href="${ctaUrl}" 
                             target="_blank"
                             style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 10px;">
                            ${ctaText}
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : ""}
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px 0;">
              
              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="divider" style="border-bottom: 1px solid #e4e4e7; padding-bottom: 24px;"></td>
                </tr>
              </table>
              
              <!-- Footer content -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top: 24px;">
                <tr>
                  <td align="center" class="text-muted" style="font-size: 13px; color: #71717a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
                    <p style="margin: 0 0 12px;">
                      You're receiving this because you have an account on Elsa Workflows.
                    </p>
                    <p style="margin: 0 0 16px;">
                      <a href="${preferencesUrl}" style="color: #6366f1; text-decoration: none;">Manage preferences</a>
                      <span style="color: #d4d4d8; margin: 0 8px;">·</span>
                      <a href="${unsubscribeUrl}" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                      <a href="https://elsa-workflows.io" style="color: #a1a1aa; text-decoration: none;">Elsa Workflows</a> · Made with care
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, headers };
}

// Helper to format minutes as "Xh Ym"
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Helper to format currency
export function formatCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
