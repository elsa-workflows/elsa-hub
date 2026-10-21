// Isolated SQL access for Stripe customer refs (tables from
// supabase/migrations/20261020200000_stripe_customer_refs.sql):
//   org_stripe_customers  primary key (organization_id, livemode), unique stripe_customer_id
//   user_stripe_customers primary key (user_id, livemode), unique stripe_customer_id
// If a column name or key changes, update only this file.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { stripeKeyMode } from "../_shared/stripe-customer.ts";

const LIVEMODE_COLUMN = "livemode";
const USER_REF_TABLE = "user_stripe_customers";
const ORG_REF_TABLE = "org_stripe_customers";
const USER_ID_COLUMN = "user_id";
const ORG_ID_COLUMN = "organization_id";
const CUSTOMER_ID_COLUMN = "stripe_customer_id";

export type StripeCustomerRefKind = "user" | "organization";

export type StripeCustomerRefStore = {
  getCustomerId: (
    kind: StripeCustomerRefKind,
    ownerId: string,
    livemode: boolean,
  ) => Promise<string | null>;
  // True when any ref row other than (kind, ownerId, livemode), in either
  // table, holds this customer id.
  isReferencedElsewhere: (
    customerId: string,
    kind: StripeCustomerRefKind,
    ownerId: string,
    livemode: boolean,
  ) => Promise<boolean>;
  // Removes the ref only while it still holds customerId, so a ref that was
  // replaced after it was read is never cleared.
  clearRef: (
    kind: StripeCustomerRefKind,
    ownerId: string,
    livemode: boolean,
    customerId: string,
  ) => Promise<void>;
};

function tableForKind(kind: StripeCustomerRefKind): {
  table: string;
  ownerColumn: "user_id" | "organization_id";
} {
  if (kind === "user") {
    return { table: USER_REF_TABLE, ownerColumn: USER_ID_COLUMN };
  }
  return { table: ORG_REF_TABLE, ownerColumn: ORG_ID_COLUMN };
}

// Standard (sk_) and restricted (rk_) secret keys both carry their mode.
// Throws on an unknown prefix (see stripeKeyMode).
export function livemodeFromStripeSecretKey(secretKey: string): boolean {
  return stripeKeyMode(secretKey) === "live";
}

export function createSupabaseStripeRefStore(
  client: SupabaseClient,
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
      return row?.[CUSTOMER_ID_COLUMN] ?? null;
    },

    async isReferencedElsewhere(customerId, kind, ownerId, livemode) {
      for (const candidate of ["user", "organization"] as const) {
        const { table, ownerColumn } = tableForKind(candidate);
        const { data, error } = await client
          .from(table)
          .select(`${ownerColumn},${LIVEMODE_COLUMN}`)
          .eq(CUSTOMER_ID_COLUMN, customerId);

        if (error) {
          throw new Error(error.message);
        }

        const rows: Array<Record<string, unknown>> = Array.isArray(data)
          ? data
          : data
          ? [data]
          : [];
        const other = rows.some((row) =>
          candidate !== kind ||
          row[ownerColumn] !== ownerId ||
          row[LIVEMODE_COLUMN] !== livemode
        );
        if (other) return true;
      }
      return false;
    },

    async clearRef(kind, ownerId, livemode, customerId) {
      const { table, ownerColumn } = tableForKind(kind);
      const { error } = await client
        .from(table)
        .delete()
        .eq(ownerColumn, ownerId)
        .eq(LIVEMODE_COLUMN, livemode)
        .eq(CUSTOMER_ID_COLUMN, customerId);

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
