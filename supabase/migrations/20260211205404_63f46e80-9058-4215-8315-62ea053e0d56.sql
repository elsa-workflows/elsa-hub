UPDATE service_providers SET name = 'Valence Works', slug = 'valence-works' WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE notifications SET action_url = REPLACE(action_url, 'skywalker-digital', 'valence-works') WHERE action_url LIKE '%skywalker-digital%';