-- Likes for blog posts, keyed by anonymous visitor id stored in browser localStorage.
CREATE TABLE public.blog_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (slug, visitor_id)
);

CREATE INDEX idx_blog_post_likes_slug ON public.blog_post_likes(slug);

GRANT SELECT, INSERT, DELETE ON public.blog_post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.blog_post_likes TO authenticated;
GRANT ALL ON public.blog_post_likes TO service_role;

ALTER TABLE public.blog_post_likes ENABLE ROW LEVEL SECURITY;

-- Reads are public (so we can show counts and "did I like this?").
CREATE POLICY "Anyone can read blog likes"
ON public.blog_post_likes
FOR SELECT
USING (true);

-- Writes go through the RPC below (which is SECURITY DEFINER); block direct
-- writes so a visitor cannot like on behalf of someone else's visitor_id.
CREATE POLICY "No direct inserts"
ON public.blog_post_likes
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct deletes"
ON public.blog_post_likes
FOR DELETE
USING (false);

-- Toggle a like for (slug, visitor_id). Returns the new total like count.
CREATE OR REPLACE FUNCTION public.toggle_blog_like(p_slug TEXT, p_visitor_id TEXT)
RETURNS TABLE(liked BOOLEAN, total BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existed BOOLEAN;
  _slug TEXT := lower(trim(p_slug));
  _visitor TEXT := trim(p_visitor_id);
BEGIN
  IF _slug IS NULL OR length(_slug) = 0 OR length(_slug) > 200 THEN
    RAISE EXCEPTION 'Invalid slug';
  END IF;
  IF _visitor IS NULL OR length(_visitor) < 8 OR length(_visitor) > 100 THEN
    RAISE EXCEPTION 'Invalid visitor id';
  END IF;

  DELETE FROM public.blog_post_likes
   WHERE slug = _slug AND visitor_id = _visitor
  RETURNING true INTO _existed;

  IF _existed IS NULL THEN
    INSERT INTO public.blog_post_likes (slug, visitor_id)
    VALUES (_slug, _visitor);
    liked := true;
  ELSE
    liked := false;
  END IF;

  SELECT COUNT(*) INTO total
  FROM public.blog_post_likes
  WHERE slug = _slug;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_blog_like(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_blog_like(TEXT, TEXT) TO anon, authenticated;

-- Batch fetch like counts for many slugs (used on the blog index).
CREATE OR REPLACE FUNCTION public.get_blog_like_counts(p_slugs TEXT[])
RETURNS TABLE(slug TEXT, total BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bl.slug, COUNT(*)::BIGINT
  FROM public.blog_post_likes bl
  WHERE bl.slug = ANY(p_slugs)
  GROUP BY bl.slug;
$$;

REVOKE ALL ON FUNCTION public.get_blog_like_counts(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_blog_like_counts(TEXT[]) TO anon, authenticated;