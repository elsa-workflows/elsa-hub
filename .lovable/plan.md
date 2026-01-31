

## Display Credit Bundles to Anonymous Users (Without Sensitive Data)

Create a database view that exposes only safe bundle fields to the public, keeping Stripe IDs and internal provider references hidden.

---

### Approach

Create a PostgreSQL view `credit_bundles_public` that:
- Exposes only display-safe columns (name, price, hours, etc.)
- Excludes sensitive columns (`stripe_price_id`, `service_provider_id`)
- Has RLS disabled (views inherit table RLS by default, but we'll grant public SELECT)
- Can be queried by anonymous visitors for display purposes

The purchase flow (authenticated) continues using the full `credit_bundles` table with the `stripe_price_id`.

---

### Database Changes

**Create public view:**
```sql
CREATE VIEW credit_bundles_public AS
SELECT 
  id,
  name,
  description,
  hours,
  price_cents,
  currency,
  billing_type,
  recurring_interval,
  monthly_hours,
  priority_level
FROM credit_bundles
WHERE is_active = true;

-- Grant public access to the view
GRANT SELECT ON credit_bundles_public TO anon;
GRANT SELECT ON credit_bundles_public TO authenticated;
```

---

### Frontend Changes

| File | Change |
|------|--------|
| `src/hooks/useCreditBundles.ts` | Query `credit_bundles_public` view instead of `credit_bundles` table |
| `src/hooks/useCreditBundles.ts` | Remove `stripe_price_id` and `service_provider_id` from interface (for public hook) |
| `src/components/organization/PurchaseBundleDialog.tsx` | Keep using full bundle data (authenticated flow already works) |

---

### Data Flow

```text
Anonymous visitor → credit_bundles_public (view) → Display only
                    ✓ id, name, hours, price
                    ✗ stripe_price_id, service_provider_id

Authenticated user → credit_bundles (table via RLS) → Purchase flow
                     ✓ All fields including stripe_price_id
```

---

### Security Outcome

| User Type | Can See | Cannot See |
|-----------|---------|------------|
| Anonymous | Bundle names, prices, hours, descriptions | Stripe IDs, provider IDs |
| Authenticated | All bundle data (for purchase flow) | N/A |

---

### Technical Details

The public view approach is preferred over a database function because:
1. Views work seamlessly with Supabase client's `.from()` API
2. No need for `rpc()` calls or additional hook changes
3. Auto-generated TypeScript types will include the view
4. Simpler maintenance

