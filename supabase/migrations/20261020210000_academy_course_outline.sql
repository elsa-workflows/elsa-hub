-- Public lesson outline for published courses. RLS on academy_lessons only
-- exposes preview rows to anon and unentitled users, so the Hub cannot list
-- locked lessons or resolve paid lesson URLs from that table. This function
-- returns metadata only (no body_md) for published courses.

CREATE OR REPLACE FUNCTION public.academy_course_outline(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  sort_order integer,
  is_preview boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    lesson.id,
    lesson.slug,
    lesson.title,
    lesson.sort_order,
    lesson.is_preview
  FROM public.academy_lessons AS lesson
  INNER JOIN public.academy_courses AS course
    ON course.id = lesson.course_id
  WHERE lesson.course_id = p_course_id
    AND course.is_published = true
  ORDER BY lesson.sort_order ASC;
$$;

REVOKE ALL ON FUNCTION public.academy_course_outline(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.academy_course_outline(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.academy_course_outline(uuid) IS
  'Lesson metadata (id, slug, title, sort_order, is_preview) for a published course. No body_md. Callable by anon and authenticated so locked lesson rows can be listed without opening the table under RLS.';
