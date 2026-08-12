UPDATE public.products
SET is_active = (slug = 'valence-runtime')
WHERE slug IN ('valence-runtime', 'valence-runtime-priority', 'valence-runtime-maintainer-access');