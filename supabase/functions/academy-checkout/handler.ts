import { loadAcademyCourse, type AcademyCourseRow } from "./course.ts";
import { academyProductSpec, isTeamAcademyProduct } from "./product.ts";
import {
  invoiceCustomFields,
  resolveCustomer,
  type AcademyBillingProfile,
  type StripeCustomerLike,
} from "./stripeCustomer.ts";

export type { AcademyCourseRow };

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export type AcademyAuthUser = {
  id: string;
  email?: string | null;
};

export type AcademyCheckoutBody = {
  courseId?: string;
  productCode?: string;
  organizationId?: string;
};

export type AcademyQueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

export type AcademyCheckoutUserClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<AcademyQueryResult<boolean>>;
};

// Structural supabase-js subset. The query builder is table-dependent, so
// keep the row type loose and cast at the call site.
export type AcademyCheckoutServiceClient = {
  auth: {
    getUser: (token: string) => Promise<{
      data: { user: AcademyAuthUser | null };
      error: { message?: string } | null;
    }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order?: (column: string, options: { ascending: boolean }) => {
          limit: (n: number) => {
            maybeSingle: () => Promise<AcademyQueryResult<unknown>>;
          };
        };
        limit?: (n: number) => {
          maybeSingle: () => Promise<AcademyQueryResult<unknown>>;
        };
        maybeSingle: () => Promise<AcademyQueryResult<unknown>>;
        single: () => Promise<AcademyQueryResult<unknown>>;
      };
    };
  };
};

export type AcademyStripeLike = StripeCustomerLike & {
  checkout: {
    sessions: {
      create: (params: Record<string, unknown>) => Promise<{ id: string; url: string | null }>;
    };
  };
};

export type AcademyCheckoutDeps = {
  userClient: AcademyCheckoutUserClient;
  serviceClient: AcademyCheckoutServiceClient;
  stripe: AcademyStripeLike;
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function runAcademyCheckout(params: {
  user: AcademyAuthUser;
  body: AcademyCheckoutBody;
  origin: string;
  deps: AcademyCheckoutDeps;
}): Promise<Response> {
  const { user, body, origin, deps } = params;
  const userId = user.id;
  const userEmail = user.email;

  if (!userEmail) {
    return jsonResponse(400, { error: "User email not found" });
  }

  const loaded = await loadAcademyCourse(deps.serviceClient, body);
  if (loaded.error) return jsonResponse(loaded.error.status, loaded.error.body);
  const course = loaded.course!;

  const spec = academyProductSpec(course.product_code);
  if (!spec) {
    return jsonResponse(400, { error: "Unsupported Academy product" });
  }

  if (!course.stripe_price_id) {
    return jsonResponse(400, { error: "This course is not configured for purchase yet" });
  }

  const teamProduct = isTeamAcademyProduct(course.product_code);
  const organizationId = body.organizationId;

  if (teamProduct && !organizationId) {
    return jsonResponse(400, { error: "organizationId is required for Team purchases" });
  }

  if (teamProduct) {
    const { data: isAdmin, error: adminError } = await deps.userClient.rpc("is_org_admin", {
      p_org_id: organizationId,
    });
    if (adminError || !isAdmin) {
      return jsonResponse(403, { error: "Only organization admins can purchase Team seats" });
    }
  }

  let organizationName: string | undefined;
  let billingProfile: AcademyBillingProfile | null = null;

  if (organizationId) {
    const { data: org, error: orgError } = await deps.serviceClient
      .from("organizations")
      .select("slug, name")
      .eq("id", organizationId)
      .single();
    if (orgError || !org) {
      return jsonResponse(404, { error: "Organization not found" });
    }
    organizationName = (org as { name: string }).name;

    const { data: profile } = await deps.serviceClient
      .from("org_billing_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    billingProfile = (profile as AcademyBillingProfile | null) ?? null;
  }

  const stripeCustomerId = await resolveCustomer({
    stripe: deps.stripe,
    email: userEmail,
    userId,
    organizationId: teamProduct ? organizationId : undefined,
    organizationName,
    billingProfile,
  });

  const metadata: Record<string, string> = {
    kind: "academy",
    product_code: course.product_code,
    course_id: course.id,
    user_id: userId,
    seats: String(spec.seats),
  };
  if (teamProduct && organizationId) {
    metadata.organization_id = organizationId;
  }

  const customFields = invoiceCustomFields(billingProfile, organizationName);
  const sessionConfig: Record<string, unknown> = {
    mode: "payment",
    line_items: [{ price: course.stripe_price_id, quantity: 1 }],
    metadata,
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: course.title,
        metadata,
        ...(customFields.length > 0 && { custom_fields: customFields }),
      },
    },
    success_url: `${origin}/academy/${course.slug}?payment=success`,
    cancel_url: `${origin}/academy/${course.slug}`,
  };

  if (stripeCustomerId) {
    sessionConfig.customer = stripeCustomerId;
    sessionConfig.customer_update = { address: "auto", name: "auto" };
  } else {
    sessionConfig.customer_email = userEmail;
  }

  try {
    const session = await deps.stripe.checkout.sessions.create(sessionConfig);
    return jsonResponse(200, { checkoutUrl: session.url, sessionId: session.id });
  } catch (error: unknown) {
    const stripeCode = (error as { code?: string } | null)?.code;
    if (stripeCode === "customer_tax_location_invalid") {
      return jsonResponse(400, {
        error:
          "We couldn't determine your tax location. Please complete your billing address (including country and postal code), then try again.",
        code: "customer_tax_location_invalid",
      });
    }
    throw error;
  }
}

export async function handleAcademyCheckoutRequest(
  req: Request,
  depsFactory: (authHeader: string) => Promise<AcademyCheckoutDeps | Response>,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const deps = await depsFactory(authHeader);
    if (deps instanceof Response) return deps;

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await deps.serviceClient.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    let body: AcademyCheckoutBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    const origin = req.headers.get("origin") || "https://elsa-hub.lovable.app";
    return await runAcademyCheckout({ user, body, origin, deps });
  } catch (error: unknown) {
    console.error("Academy checkout session error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonResponse(500, { error: message });
  }
}
