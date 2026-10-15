// Training-owned Academy fulfillment. Grant and revoke academy_entitlements
// through service_role. Support-hours and runtime handlers must not run for
// sessions with metadata.kind === "academy".

export type AcademySession = {
  id: string;
  payment_status?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

export type AcademyCharge = {
  id: string;
  payment_intent?: string | { id: string } | null;
  refunded?: boolean;
  amount?: number;
  amount_refunded?: number;
};

export type AcademyEntitlementRow = {
  course_id: string | null;
  product_code: string | null;
  subject_type: "user" | "org";
  user_id: string | null;
  organization_id: string | null;
  seats: number;
  source: "stripe";
  stripe_checkout_session_id: string;
};

export type AcademySupabase = {
  from: (table: string) => {
    insert: (row: AcademyEntitlementRow) => Promise<{
      error: { code?: string; message?: string } | null;
    }>;
    update: (values: { revoked_at: string }) => {
      eq: (column: string, value: string) => {
        is: (column: string, value: null) => Promise<{
          error: { code?: string; message?: string } | null;
        }>;
      };
    };
  };
};

export type AcademyStripeRefundLookup = {
  checkout: {
    sessions: {
      list: (params: { payment_intent: string; limit: number }) => Promise<{
        data: AcademySession[];
      }>;
    };
  };
};

export type AcademyHandleResult = {
  handled: boolean;
  reason?: string;
};

function seatsForProductCode(productCode: string | undefined, rawSeats: string | undefined): number {
  const fromMeta = rawSeats ? Number.parseInt(rawSeats, 10) : NaN;
  if (Number.isFinite(fromMeta) && fromMeta > 0) return fromMeta;
  if (productCode === "team_10") return 10;
  if (productCode === "team_5") return 5;
  return 1;
}

export function isAcademySession(session: AcademySession | null | undefined): boolean {
  return session?.metadata?.kind === "academy";
}

export async function handleAcademyCheckout(
  supabase: AcademySupabase,
  session: AcademySession,
): Promise<AcademyHandleResult> {
  if (!isAcademySession(session)) {
    return { handled: false, reason: "not_academy" };
  }

  if (session.payment_status === "unpaid") {
    return { handled: true, reason: "unpaid" };
  }

  const metadata = session.metadata ?? {};
  const productCode = metadata.product_code;
  if (!productCode) {
    console.error("Academy checkout missing product_code");
    return { handled: true, reason: "missing_grant_target" };
  }

  const organizationId = metadata.organization_id || null;
  const userId = metadata.user_id || null;
  const seats = seatsForProductCode(productCode, metadata.seats);
  const subjectType = organizationId ? "org" : "user";

  if (subjectType === "user" && !userId) {
    console.error("Academy user grant missing user_id");
    return { handled: true, reason: "missing_user" };
  }
  if (subjectType === "org" && !organizationId) {
    console.error("Academy org grant missing organization_id");
    return { handled: true, reason: "missing_org" };
  }

  const row: AcademyEntitlementRow = {
    // SKU grant: has_academy_access matches product_code against
    // academy_courses.product_codes. Do not pin course_id or a Team
    // purchase of team_5 would only unlock the catalog row, not every
    // course that lists that SKU.
    course_id: null,
    product_code: productCode,
    subject_type: subjectType,
    user_id: subjectType === "user" ? userId : null,
    organization_id: subjectType === "org" ? organizationId : null,
    seats,
    source: "stripe",
    stripe_checkout_session_id: session.id,
  };

  const { error } = await supabase.from("academy_entitlements").insert(row);
  if (error && error.code !== "23505") {
    console.error("Failed to grant academy entitlement:", error);
    throw new Error(error.message || "Failed to grant academy entitlement");
  }

  if (error?.code === "23505") {
    console.log(`Academy entitlement already exists for session ${session.id}`);
    return { handled: true, reason: "replay" };
  }

  console.log(`Academy entitlement granted for session ${session.id}`);
  return { handled: true, reason: "granted" };
}

export function isFullAcademyRefund(charge: AcademyCharge): boolean {
  if (charge.refunded === true) return true;
  const amount = charge.amount;
  const amountRefunded = charge.amount_refunded;
  return typeof amount === "number" &&
    typeof amountRefunded === "number" &&
    amountRefunded >= amount;
}

export async function handleAcademyRefund(
  supabase: AcademySupabase,
  stripe: AcademyStripeRefundLookup,
  charge: AcademyCharge,
): Promise<AcademyHandleResult> {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;

  if (!paymentIntentId) {
    return { handled: false, reason: "no_payment_intent" };
  }

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const session = sessions.data[0];
  if (!isAcademySession(session)) {
    return { handled: false, reason: "not_academy" };
  }

  if (!isFullAcademyRefund(charge)) {
    console.log(
      `Academy charge ${charge.id} is a partial refund; leaving entitlement for session ${session.id}`,
    );
    return { handled: true, reason: "partial_refund" };
  }

  const { error } = await supabase
    .from("academy_entitlements")
    .update({ revoked_at: new Date().toISOString() })
    .eq("stripe_checkout_session_id", session.id)
    .is("revoked_at", null);

  if (error) {
    console.error("Failed to revoke academy entitlement:", error);
    throw new Error(error.message || "Failed to revoke academy entitlement");
  }

  console.log(`Academy entitlement revoked for session ${session.id}`);
  return { handled: true, reason: "revoked" };
}
