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