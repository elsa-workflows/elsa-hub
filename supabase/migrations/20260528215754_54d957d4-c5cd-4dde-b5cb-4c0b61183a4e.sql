CREATE TABLE public.blog_post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  view_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, visitor_id, view_date)
);

CREATE INDEX idx_blog_post_views_slug ON public.blog_post_views(slug);

GRANT SELECT ON public.blog_post_views TO anon, authenticated;
GRANT ALL ON public.blog_post_views TO service_role;

ALTER TABLE public.blog_post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blog views" ON public.blog_post_views FOR SELECT USING (true);
CREATE POLICY "No direct inserts" ON public.blog_post_views FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct deletes" ON public.blog_post_views FOR DELETE USING (false);

CREATE OR REPLACE FUNCTION public.record_blog_view(p_slug TEXT, p_visitor_id TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slug TEXT := lower(trim(p_slug));
  _visitor TEXT := trim(p_visitor_id);
  _total BIGINT;
BEGIN
  IF _slug IS NULL OR length(_slug) = 0 OR length(_slug) > 200 THEN
    RAISE EXCEPTION 'Invalid slug';
  END IF;
  IF _visitor IS NULL OR length(_visitor) < 8 OR length(_visitor) > 100 THEN
    RAISE EXCEPTION 'Invalid visitor id';
  END IF;

  INSERT INTO public.blog_post_views (slug, visitor_id)
  VALUES (_slug, _visitor)
  ON CONFLICT (slug, visitor_id, view_date) DO NOTHING;

  SELECT COUNT(*) INTO _total FROM public.blog_post_views WHERE slug = _slug;
  RETURN _total;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_blog_view_counts(p_slugs TEXT[])
RETURNS TABLE(slug TEXT, total BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bv.slug, COUNT(*)::BIGINT
  FROM public.blog_post_views bv
  WHERE bv.slug = ANY(p_slugs)
  GROUP BY bv.slug;
$$;

GRANT EXECUTE ON FUNCTION public.record_blog_view(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_blog_view_counts(TEXT[]) TO anon, authenticated;