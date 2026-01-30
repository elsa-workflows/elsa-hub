-- Update Starter Pack: €900 (5h) - €180/hr
UPDATE credit_bundles SET 
  price_cents = 90000, 
  currency = 'eur',
  description = '€180 per hour. Best for short architectural reviews or focused guidance.'
WHERE name = 'Starter Pack';

-- Update Growth Pack: €1,650 (10h) - €165/hr
UPDATE credit_bundles SET 
  price_cents = 165000, 
  currency = 'eur',
  description = '€165 per hour. Ideal for teams ramping up or validating architectural decisions.'
WHERE name = 'Growth Pack';

-- Update Scale Pack: €3,875 (25h) - €155/hr
UPDATE credit_bundles SET 
  price_cents = 387500, 
  currency = 'eur',
  description = '€155 per hour. Designed for ongoing projects and deeper technical collaboration.'
WHERE name = 'Scale Pack';

-- Update Enterprise Pack: €7,500 (50h) - €150/hr
UPDATE credit_bundles SET 
  price_cents = 750000, 
  currency = 'eur',
  description = '€150 per hour (maximum volume discount). Best suited for larger teams and longer-running initiatives.'
WHERE name = 'Enterprise Pack';

-- Update subscription: €1,100/month, rename to Retained Advisory
UPDATE credit_bundles SET 
  price_cents = 110000, 
  currency = 'eur',
  name = 'Retained Advisory',
  description = 'Priority scheduling, async Q&A access, continuity and retained architectural context.'
WHERE billing_type = 'recurring';