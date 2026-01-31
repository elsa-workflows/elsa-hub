-- Update credit_bundles with new correct EUR Stripe Price IDs
UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvauBR90AfIREKG7UCh9SRN' 
WHERE name = 'Starter Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvauCR90AfIREKGmAtpUbow' 
WHERE name = 'Growth Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvauDR90AfIREKGfstq5Mpg' 
WHERE name = 'Scale Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvauER90AfIREKGwgqQG6ih' 
WHERE name = 'Enterprise Pack';

UPDATE public.credit_bundles 
SET stripe_price_id = 'price_1SvauFR90AfIREKG7rYh5Z7Q' 
WHERE name = 'Retained Advisory';