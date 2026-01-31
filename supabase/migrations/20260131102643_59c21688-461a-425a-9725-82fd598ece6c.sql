-- Update credit_bundles with LIVE Stripe Price IDs
UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvbNtR90AfIREKG0ajXItkD' 
WHERE name = 'Starter Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvbNuR90AfIREKG23BikkE9' 
WHERE name = 'Growth Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvbNuR90AfIREKGsoNrYEaJ' 
WHERE name = 'Scale Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvbNvR90AfIREKGdHXA9t3b' 
WHERE name = 'Enterprise Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvbNwR90AfIREKG87jmVWPu' 
WHERE name = 'Retained Advisory';