-- Update credit_bundles with NEW Stripe Price IDs
UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvcAhR44lqjU5yVN4NqP8lA' 
WHERE name = 'Starter Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvcAiR44lqjU5yVnfIT9As2' 
WHERE name = 'Growth Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvcAjR44lqjU5yVyTIHXSZs' 
WHERE name = 'Scale Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvcAkR44lqjU5yVxLXdnzaj' 
WHERE name = 'Enterprise Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvcAlR44lqjU5yVCDGt4lF9' 
WHERE name = 'Retained Advisory';