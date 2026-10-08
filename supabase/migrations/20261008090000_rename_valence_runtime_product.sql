-- Rename the public product while preserving established subscription slugs,
-- registry identifiers, licence records, and provider ownership.
UPDATE public.products AS product
SET
  name = 'Elsa Runtime',
  updated_at = now()
FROM public.service_providers AS provider
WHERE product.service_provider_id = provider.id
  AND provider.slug = 'valence-works'
  AND product.slug = 'valence-runtime';

UPDATE public.products AS product
SET
  name = 'Elsa Runtime Priority',
  description = replace(description, 'Valence Runtime', 'Elsa Runtime'),
  updated_at = now()
FROM public.service_providers AS provider
WHERE product.service_provider_id = provider.id
  AND provider.slug = 'valence-works'
  AND product.slug = 'valence-runtime-priority';
