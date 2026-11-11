-- Reject seeded radar placeholders and any street-address city (Ahornweg).
--
-- Production rows live in public.radar_locations. The first radar migration
-- planted showcase + anonymous sample cities and a later migration approved
-- them. Real submissions set submitted_at / submitted_by /
-- submitted_contact_email; seed rows did not. Some seed showcases were later
-- flipped to anonymous (company cleared) but still have no submitter metadata.
--
-- The public Community Radar page already hides these rows in code. This
-- script is the production data fix so admin and any other reader also see
-- them as rejected.
--
-- Do not run against production from this repo's CI. Do not apply as a
-- migration. Review the preview SELECT, then apply by hand after merge:
--   psql "$DATABASE_URL" -f scripts/reject-radar-sample-and-street-address.sql
-- Idempotent: a second run updates zero rows.

\set ON_ERROR_STOP on

BEGIN;

-- Preview (also returned after the updates).
SELECT id, status, city, country, company_name, anonymous, submitted_at
FROM public.radar_locations
WHERE status IS DISTINCT FROM 'rejected'
  AND (
    city ILIKE '%ahornweg%'
    OR (
      submitted_at IS NULL
      AND submitted_by IS NULL
      AND submitted_contact_email IS NULL
      AND (
        company_name IN (
          'Valence Works',
          'North Claims',
          'Halberd Logistics',
          'Kiso Finance',
          'Polar Research',
          'Sable Health'
        )
        OR (city, country) IN (
          ('Amsterdam', 'Netherlands'),
          ('London', 'United Kingdom'),
          ('New York', 'United States'),
          ('Tokyo', 'Japan'),
          ('Stockholm', 'Sweden'),
          ('Vancouver', 'Canada'),
          ('Berlin', 'Germany'),
          ('Paris', 'France'),
          ('Madrid', 'Spain'),
          ('Rome', 'Italy'),
          ('Warsaw', 'Poland'),
          ('Helsinki', 'Finland'),
          ('Lisbon', 'Portugal'),
          ('Zurich', 'Switzerland'),
          ('Dublin', 'Ireland'),
          ('Brussels', 'Belgium'),
          ('Vienna', 'Austria'),
          ('Prague', 'Czechia'),
          ('San Francisco', 'United States'),
          ('Seattle', 'United States'),
          ('Austin', 'United States'),
          ('Chicago', 'United States'),
          ('Boston', 'United States'),
          ('Toronto', 'Canada'),
          ('Montreal', 'Canada'),
          ('Mexico City', 'Mexico'),
          ('São Paulo', 'Brazil'),
          ('Buenos Aires', 'Argentina'),
          ('Bogotá', 'Colombia'),
          ('Santiago', 'Chile'),
          ('Singapore', 'Singapore'),
          ('Bangalore', 'India'),
          ('Mumbai', 'India'),
          ('Seoul', 'South Korea'),
          ('Hong Kong', 'Hong Kong'),
          ('Shanghai', 'China'),
          ('Dubai', 'United Arab Emirates'),
          ('Tel Aviv', 'Israel'),
          ('Istanbul', 'Türkiye'),
          ('Cape Town', 'South Africa'),
          ('Nairobi', 'Kenya'),
          ('Lagos', 'Nigeria'),
          ('Cairo', 'Egypt'),
          ('Sydney', 'Australia'),
          ('Melbourne', 'Australia'),
          ('Auckland', 'New Zealand')
        )
      )
    )
  )
ORDER BY company_name NULLS LAST, country, city;

UPDATE public.radar_locations
SET
  status = 'rejected',
  rejection_reason = 'Seeded sample / placeholder dataset — not an opt-in deployment',
  reviewed_at = COALESCE(reviewed_at, now())
WHERE status IS DISTINCT FROM 'rejected'
  AND submitted_at IS NULL
  AND submitted_by IS NULL
  AND submitted_contact_email IS NULL
  AND (
    company_name IN (
      'Valence Works',
      'North Claims',
      'Halberd Logistics',
      'Kiso Finance',
      'Polar Research',
      'Sable Health'
    )
    OR (city, country) IN (
      ('Amsterdam', 'Netherlands'),
      ('London', 'United Kingdom'),
      ('New York', 'United States'),
      ('Tokyo', 'Japan'),
      ('Stockholm', 'Sweden'),
      ('Vancouver', 'Canada'),
      ('Berlin', 'Germany'),
      ('Paris', 'France'),
      ('Madrid', 'Spain'),
      ('Rome', 'Italy'),
      ('Warsaw', 'Poland'),
      ('Helsinki', 'Finland'),
      ('Lisbon', 'Portugal'),
      ('Zurich', 'Switzerland'),
      ('Dublin', 'Ireland'),
      ('Brussels', 'Belgium'),
      ('Vienna', 'Austria'),
      ('Prague', 'Czechia'),
      ('San Francisco', 'United States'),
      ('Seattle', 'United States'),
      ('Austin', 'United States'),
      ('Chicago', 'United States'),
      ('Boston', 'United States'),
      ('Toronto', 'Canada'),
      ('Montreal', 'Canada'),
      ('Mexico City', 'Mexico'),
      ('São Paulo', 'Brazil'),
      ('Buenos Aires', 'Argentina'),
      ('Bogotá', 'Colombia'),
      ('Santiago', 'Chile'),
      ('Singapore', 'Singapore'),
      ('Bangalore', 'India'),
      ('Mumbai', 'India'),
      ('Seoul', 'South Korea'),
      ('Hong Kong', 'Hong Kong'),
      ('Shanghai', 'China'),
      ('Dubai', 'United Arab Emirates'),
      ('Tel Aviv', 'Israel'),
      ('Istanbul', 'Türkiye'),
      ('Cape Town', 'South Africa'),
      ('Nairobi', 'Kenya'),
      ('Lagos', 'Nigeria'),
      ('Cairo', 'Egypt'),
      ('Sydney', 'Australia'),
      ('Melbourne', 'Australia'),
      ('Auckland', 'New Zealand')
    )
  );

UPDATE public.radar_locations
SET
  status = 'rejected',
  rejection_reason = 'City field contains a street address (privacy)',
  reviewed_at = COALESCE(reviewed_at, now())
WHERE status IS DISTINCT FROM 'rejected'
  AND city ILIKE '%ahornweg%';

COMMIT;
