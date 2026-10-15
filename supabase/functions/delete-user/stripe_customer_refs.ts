// Isolated SQL access for Stripe customer refs.
// Livemode column and unique keys are expected to land as:
//   org_stripe_customers  (organization_id, livemode)
//   user_stripe_customers (user_id, livemode)
// If that column name or uniqueness changes, update only this file.

const LIVEMODE_COLUMN = "livemode";
const USER_REF_TABLE = "user_stripe_customers";
const ORG_REF_TABLE = "org_stripe_customers";
const USER_ID_COLUMN = "user_id";
const ORG_ID_COLUMN = "organization_id";
const CUSTOMER_ID_COLUMN = "stripe_customer_id";

export type StripeCustomerRefKind = "user" | "organization";

export type StripeRefRow = {
  stripe_customer_id: string;
};

export type StripeRefQueryResult = {
  data: StripeRefRow | StripeRefRow[] | null;
  error: { message: string } | null;
};

export type StripeRefFilter = PromiseLike<StripeRefQueryResult> & {
  select: (columns: string) => StripeRefFilter;
  delete: () => StripeRefFilter;
  eq: (column: string, value: string | boolean) => StripeRefFilter;
  maybeSingle: () => Promise<StripeRefQueryResult>;
};

export type StripeRefClient = {
  from: (table: string) => StripeRefFilter;
};

export type StripeCustomerRefStore = {
  getCustomerId: (
    kind: StripeCustomerRefKind,
    ownerId: string,
    livemode: boolean,
  ) => Promise<string | null>;
  clearRef: (
    kind: StripeCustomerRefKind,
    ownerId: string,
    livemode: boolean,
  ) => Promise<void>;
};

function tableForKind(kind: StripeCustomerRefKind): {
  table: string;
  ownerColumn: string;
} {
  if (kind === "user") {
    return { table: USER_REF_TABLE, ownerColumn: USER_ID_COLUMN };
  }
  return { table: ORG_REF_TABLE, ownerColumn: ORG_ID_COLUMN };
}

export function livemodeFromStripeSecretKey(secretKey: string): boolean {
  if (secretKey.startsWith("sk_live_")) return true;
  if (secretKey.startsWith("sk_test_")) return false;
  throw new Error("STRIPE_SECRET_KEY must start with sk_live_ or sk_test_");
}

export function createSupabaseStripeRefStore(
  client: StripeRefClient,
): StripeCustomerRefStore {
  return {
    async getCustomerId(kind, ownerId, livemode) {
      const { table, ownerColumn } = tableForKind(kind);
      const { data, error } = await client
        .from(table)
        .select(CUSTOMER_ID_COLUMN)
        .eq(ownerColumn, ownerId)
        .eq(LIVEMODE_COLUMN, livemode)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      const row = Array.isArray(data) ? data[0] : data;
      return row?.stripe_customer_id ?? null;
    },

    async clearRef(kind, ownerId, livemode) {
      const { table, ownerColumn } = tableForKind(kind);
      const { error } = await client
        .from(table)
        .delete()
        .eq(ownerColumn, ownerId)
        .eq(LIVEMODE_COLUMN, livemode);

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
