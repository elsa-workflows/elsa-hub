// Single switch point for Academy Stripe customer reuse.
//
// Today this copies the create-checkout-session billing-profile lookup
// (email list/create plus org address and tax id). It does not add a
// customer table and does not add any email lookup beyond that existing
// path. After elsa-hub#47 lands, replace the body of resolveCustomer with
// the shared helper at supabase/functions/_shared/stripe-customer.ts.

export type AcademyBillingProfile = {
  company_legal_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  vat_number?: string | null;
  registration_number?: string | null;
};

export type StripeCustomerLike = {
  customers: {
    list: (params: { email: string; limit: number }) => Promise<{ data: Array<{ id: string }> }>;
    create: (params: Record<string, unknown>) => Promise<{ id: string }>;
    update: (id: string, params: Record<string, unknown>) => Promise<{ id: string }>;
    listTaxIds: (id: string) => Promise<{ data: Array<{ value: string }> }>;
    createTaxId: (id: string, params: { type: string; value: string }) => Promise<unknown>;
  };
};

export function getTaxIdType(countryCode: string): string {
  const euCountries = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  ];
  if (euCountries.includes(countryCode)) return "eu_vat";
  if (countryCode === "GB") return "gb_vat";
  if (countryCode === "CH") return "ch_vat";
  if (countryCode === "NO") return "no_vat";
  if (countryCode === "AU") return "au_abn";
  if (countryCode === "NZ") return "nz_gst";
  if (countryCode === "CA") return "ca_bn";
  if (countryCode === "US") return "us_ein";
  return "eu_vat";
}

export async function resolveCustomer(params: {
  stripe: StripeCustomerLike;
  email: string;
  userId: string;
  organizationId?: string;
  organizationName?: string;
  billingProfile?: AcademyBillingProfile | null;
}): Promise<string | undefined> {
  const { stripe, email, userId, organizationId, organizationName, billingProfile } = params;

  const customers = await stripe.customers.list({ email, limit: 1 });
  const addressPayload = billingProfile?.address_line1
    ? {
      line1: billingProfile.address_line1 || undefined,
      line2: billingProfile.address_line2 || undefined,
      city: billingProfile.city || undefined,
      state: billingProfile.state_province || undefined,
      postal_code: billingProfile.postal_code || undefined,
      country: billingProfile.country || undefined,
    }
    : undefined;

  const metadata: Record<string, string> = { user_id: userId };
  if (organizationId) metadata.organization_id = organizationId;

  let stripeCustomerId: string | undefined;

  if (customers.data.length > 0) {
    stripeCustomerId = customers.data[0].id;
    if (billingProfile) {
      await stripe.customers.update(stripeCustomerId, {
        name: billingProfile.company_legal_name || organizationName,
        address: addressPayload,
        metadata,
      });
    }
  } else {
    const customer = await stripe.customers.create({
      email,
      name: billingProfile?.company_legal_name || organizationName,
      address: addressPayload,
      metadata,
    });
    stripeCustomerId = customer.id;
  }

  if (billingProfile?.vat_number && billingProfile?.country && stripeCustomerId) {
    try {
      const taxIdType = getTaxIdType(billingProfile.country);
      const existingTaxIds = await stripe.customers.listTaxIds(stripeCustomerId);
      const hasVat = existingTaxIds.data.some((t) => t.value === billingProfile.vat_number);
      if (!hasVat) {
        await stripe.customers.createTaxId(stripeCustomerId, {
          type: taxIdType,
          value: billingProfile.vat_number,
        });
      }
    } catch (taxError) {
      console.error("Failed to add tax ID (non-fatal):", taxError);
    }
  }

  return stripeCustomerId;
}

export function invoiceCustomFields(
  billingProfile: AcademyBillingProfile | null | undefined,
  organizationName?: string,
): Array<{ name: string; value: string }> {
  const fields: Array<{ name: string; value: string }> = [];
  if (!billingProfile) return fields;
  if (billingProfile.vat_number) {
    fields.push({ name: "VAT number", value: billingProfile.vat_number });
  }
  if (billingProfile.registration_number) {
    fields.push({
      name: "Company reg. no.",
      value: billingProfile.registration_number,
    });
  }
  if (
    billingProfile.company_legal_name &&
    billingProfile.company_legal_name !== organizationName
  ) {
    fields.push({
      name: "Billed to",
      value: billingProfile.company_legal_name,
    });
  }
  return fields;
}
