-- Set recommended monthly minutes for each bundle (proportional to total hours)
-- Starter Pack (5h) -> 60 min/month (~1h)
UPDATE credit_bundles SET recommended_monthly_minutes = 60 WHERE id = 'b14a49d6-054f-4989-9f45-734abce42ab2';

-- Growth Pack (10h) -> 120 min/month (~2h)
UPDATE credit_bundles SET recommended_monthly_minutes = 120 WHERE id = 'c7fd158b-f584-4383-86dd-397cd5eead0f';

-- Scale Pack (25h) -> 300 min/month (~5h)
UPDATE credit_bundles SET recommended_monthly_minutes = 300 WHERE id = '356ed42c-e600-4b61-86ec-36a539a772ee';

-- Enterprise Pack (50h) -> 480 min/month (~8h)
UPDATE credit_bundles SET recommended_monthly_minutes = 480 WHERE id = '49fc276c-55c5-40a1-ab0a-c4fd96a7151c';

-- Ongoing Advisory (recurring) -> 180 min/month (~3h)
UPDATE credit_bundles SET recommended_monthly_minutes = 180 WHERE id = '970c00ba-311f-4d5d-993b-27eba5c165af';