-- Update Stripe Price IDs for the new Stripe account
UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SudolR90AfIREKGRzejD0vT' 
WHERE name = 'Starter Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SudolR90AfIREKG4oLdxh4u' 
WHERE name = 'Growth Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SudomR90AfIREKGmFeKXXk5' 
WHERE name = 'Scale Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SudonR90AfIREKGT7ZkWB9E' 
WHERE name = 'Enterprise Pack';