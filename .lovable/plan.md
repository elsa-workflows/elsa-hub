

# Seed Provider Members for Skywalker Digital

## What We Need to Do

Add two users as team members of the "Skywalker Digital" service provider so they can access the provider dashboard, see customer orders, and log work.

## Data to Insert

| User | Email | Role | Provider |
|------|-------|------|----------|
| Sipke | sipkeschoorstra@outlook.com | owner | Skywalker Digital |
| Skywalker | skywalkertdp@gmail.com | admin | Skywalker Digital |

## SQL to Execute

Run this SQL in the Supabase SQL Editor:

```sql
-- Add sipkeschoorstra@outlook.com as owner of Skywalker Digital
INSERT INTO provider_members (service_provider_id, user_id, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'c33ba42e-5927-4989-beee-017b09caef35',
  'owner'
);

-- Add skywalkertdp@gmail.com as admin
INSERT INTO provider_members (service_provider_id, user_id, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'c7bda8eb-b596-495c-ade8-9c477a582a34',
  'admin'
);
```

## Expected Result

After running this SQL:

1. Both users will be able to access the Skywalker Digital provider dashboard
2. The RLS function `is_provider_member()` will return true for these users
3. Orders, customers, and work logs will be visible in the provider dashboard
4. Both users can log work against customer credits

## Verification

After inserting, verify with:

```sql
SELECT pm.*, p.email 
FROM provider_members pm
JOIN profiles p ON p.user_id = pm.user_id;
```

