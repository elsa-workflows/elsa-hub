
# Organization Billing & Invoice Configuration Plan

## Overview
This plan adds billing information (address, VAT number, company registration number) to organizations so they can receive proper invoices when purchasing products. The implementation follows the existing architecture pattern where sensitive billing data is isolated from the main organization table.

---

## 1. Database Schema Changes

### Create `org_billing_profiles` Table
A new table will store billing-specific information, separate from the main `organizations` table for privacy (as noted in the project memory).

```sql
CREATE TABLE org_billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Company identification
  company_legal_name TEXT,
  registration_number TEXT,  -- Chamber of Commerce / Company Registration
  vat_number TEXT,           -- VAT/Tax ID
  
  -- Billing address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT,              -- ISO 3166-1 alpha-2 country code
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS: Only org admins can access billing profiles
ALTER TABLE org_billing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view billing profile"
  ON org_billing_profiles FOR SELECT
  USING (is_org_admin(organization_id));

CREATE POLICY "Org admins can insert billing profile"
  ON org_billing_profiles FOR INSERT
  WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "Org admins can update billing profile"
  ON org_billing_profiles FOR UPDATE
  USING (is_org_admin(organization_id))
  WITH CHECK (is_org_admin(organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_org_billing_profiles_updated_at
  BEFORE UPDATE ON org_billing_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 2. Frontend Components

### 2.1 New Component: `BillingProfileCard.tsx`
A form card for managing billing information in the Organization Settings page.

**Features:**
- Display current billing details (company name, registration, VAT, address)
- Edit mode with form validation (using react-hook-form + zod)
- Country selector dropdown with common countries
- Only visible to organization admins

**Fields:**
| Field | Label | Validation |
|-------|-------|------------|
| company_legal_name | Legal Company Name | Optional |
| registration_number | Company Registration (CoC) | Optional |
| vat_number | VAT Number | Optional, format hint based on country |
| address_line1 | Street Address | Optional |
| address_line2 | Address Line 2 | Optional |
| city | City | Optional |
| state_province | State/Province | Optional |
| postal_code | Postal Code | Optional |
| country | Country | Dropdown (ISO 3166-1 codes) |

### 2.2 Update: `OrgSettings.tsx`
Add the `BillingProfileCard` component to the Organization Settings page, positioned between "Organization Details" and "Danger Zone".

---

## 3. Custom Hook

### New Hook: `useBillingProfile.ts`
Manage fetching and updating the billing profile:

```typescript
export function useBillingProfile(organizationId: string | undefined) {
  // Query: Fetch billing profile for organization
  // Mutation: Upsert billing profile (create or update)
  // Returns: { billingProfile, isLoading, updateBillingProfile, isUpdating }
}
```

---

## 4. Stripe Integration Updates

### 4.1 Update: `create-checkout-session` Edge Function
Enhance the checkout flow to:

1. **Fetch billing profile** before creating Stripe session
2. **Create/update Stripe customer** with billing information:
   - Name (from billing profile or org name)
   - Address (line1, line2, city, state, postal_code, country)
   - Tax ID (if VAT number provided)
3. **Configure session options**:
   - `billing_address_collection: 'auto'` - Collect if not already on customer
   - `tax_id_collection: { enabled: true }` - Allow customers to add tax IDs
   - `customer_update: { address: 'auto', name: 'auto' }` - Save collected info to customer

**Key changes:**
```typescript
// Fetch billing profile for the organization
const { data: billingProfile } = await serviceClient
  .from("org_billing_profiles")
  .select("*")
  .eq("organization_id", organizationId)
  .maybeSingle();

// Create or update Stripe customer with billing info
const customerData = {
  email: userEmail,
  name: billingProfile?.company_legal_name || org.name,
  address: billingProfile ? {
    line1: billingProfile.address_line1,
    line2: billingProfile.address_line2,
    city: billingProfile.city,
    state: billingProfile.state_province,
    postal_code: billingProfile.postal_code,
    country: billingProfile.country,
  } : undefined,
  metadata: {
    organization_id: organizationId,
    user_id: userId,
  },
};

// Add tax ID if VAT number exists
if (billingProfile?.vat_number && billingProfile?.country) {
  // Determine tax ID type based on country (eu_vat, gb_vat, etc.)
  await stripe.customers.createTaxId(stripeCustomerId, {
    type: getTaxIdType(billingProfile.country),
    value: billingProfile.vat_number,
  });
}

// Session config additions
const sessionConfig = {
  ...existingConfig,
  billing_address_collection: 'auto',
  tax_id_collection: { enabled: true },
  customer_update: {
    address: 'auto',
    name: 'auto',
  },
};
```

### 4.2 Update: `stripe-webhook` Edge Function
After successful checkout, sync any new billing information back to the database:

1. On `checkout.session.completed`, extract `customer_details` from session
2. If the customer updated their address or added tax IDs, update `org_billing_profiles`
3. This ensures our database stays in sync with what customers enter in Stripe Checkout

---

## 5. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/organization/BillingProfileCard.tsx` | Create | Billing info form component |
| `src/components/organization/index.ts` | Update | Export new component |
| `src/hooks/useBillingProfile.ts` | Create | Hook for billing profile CRUD |
| `src/pages/dashboard/org/OrgSettings.tsx` | Update | Add BillingProfileCard |
| `supabase/functions/create-checkout-session/index.ts` | Update | Pass billing info to Stripe |
| `supabase/functions/stripe-webhook/index.ts` | Update | Sync billing info back |
| Database migration | Create | New org_billing_profiles table |

---

## 6. Technical Considerations

### Tax ID Type Mapping
Different countries use different tax ID types in Stripe. A helper function will map country codes:

```typescript
function getTaxIdType(countryCode: string): Stripe.TaxIdCreateParams['type'] {
  const euCountries = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', ...];
  if (euCountries.includes(countryCode)) return 'eu_vat';
  if (countryCode === 'GB') return 'gb_vat';
  if (countryCode === 'US') return 'us_ein';
  // ... additional mappings
  return 'eu_vat'; // Default fallback
}
```

### Privacy & Security
- Billing profiles are only accessible to org admins (RLS enforced)
- Service providers cannot see customer billing information
- VAT numbers and addresses are stored securely in Supabase

### Stripe Customer Handling
- The checkout flow already creates/retrieves Stripe customers by email
- Enhanced flow will also update the customer with billing details
- Tax IDs are attached to the Stripe customer for invoice generation

---

## 7. User Experience Flow

1. **Org admin navigates to Settings**
2. **Sees new "Billing Information" card**
3. **Fills in company details** (legal name, registration, VAT)
4. **Adds billing address** (street, city, country, etc.)
5. **Saves billing profile**
6. **During checkout**, Stripe uses this information automatically
7. **Invoices/receipts** display the correct company and VAT details

---

## 8. Implementation Order

1. Database migration (create `org_billing_profiles` table)
2. Create `useBillingProfile` hook
3. Create `BillingProfileCard` component
4. Update `OrgSettings.tsx` to include the new card
5. Update `create-checkout-session` Edge Function
6. Update `stripe-webhook` Edge Function (sync billing info)
7. Test end-to-end flow
