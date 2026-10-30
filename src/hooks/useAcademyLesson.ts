import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademyPaymentPoll } from "@/hooks/useAcademyPaymentPoll";
import {
  canReadLessonBody,
  fetchLessonBody,
  getLessonPageMeta,
  hasAcademyAccess,
  listCourseKitAssets,
  listLessonAssets,
} from "@/lib/academy";

export function useAcademyLesson(courseSlug: string | undefined, lessonSlug: string | undefined) {
  const { user, loading: authLoading } = useAuth();
  const paymentPoll = useAcademyPaymentPoll();

  const metaQuery = useQuery({
    queryKey: ["academy-lesson-meta", courseSlug, lessonSlug],
    queryFn: () => getLessonPageMeta(courseSlug!, lessonSlug!),
    enabled: Boolean(courseSlug && lessonSlug),
  });

  const course = metaQuery.data?.course ?? null;
  const lesson = metaQuery.data?.lesson ?? null;
  const isPreview = lesson?.is_preview === true;

  const accessQuery = useQuery({
    queryKey: ["academy-access", course?.id, user?.id],
    queryFn: () => hasAcademyAccess(course!.id),
    enabled: Boolean(course?.id && user),
    // Back from Stripe: the webhook may not have granted access yet.
    refetchInterval: (query) => paymentPoll(query.state.data === true),
  });

  const hasAccess = accessQuery.data === true;
  const canRead = Boolean(lesson && canReadLessonBody(lesson, hasAccess));

  const bodyQuery = useQuery({
    queryKey: ["academy-lesson-body", lesson?.id],
    queryFn: () => fetchLessonBody(lesson!.id),
    enabled: Boolean(lesson?.id && canRead),
  });

  const assetsQuery = useQuery({
    queryKey: ["academy-lesson-assets", course?.id, lesson?.id],
    queryFn: () => listLessonAssets(course!.id, lesson!.id),
    enabled: Boolean(course?.id && lesson?.id && hasAccess),
  });

  // Same query as the course page, so the lab kit comes from one cached, entitlement-gated read.
  const kitsQuery = useQuery({
    queryKey: ["academy-course-kits", course?.id],
    queryFn: () => listCourseKitAssets(course!.id),
    enabled: Boolean(course?.id && hasAccess),
  });

  return {
    course,
    lesson,
    bodyMd: canRead ? (bodyQuery.data ?? null) : null,
    assets: hasAccess ? (assetsQuery.data ?? []) : [],
    kitAssets: hasAccess ? (kitsQuery.data ?? []) : [],
    hasAccess,
    isPreview,
    canRead,
    authLoading,
    user,
    notFound: metaQuery.isSuccess && metaQuery.data === null,
    isLoading:
      authLoading ||
      metaQuery.isLoading ||
      (Boolean(user && course) && accessQuery.isLoading) ||
      (canRead && bodyQuery.isLoading),
    isError: metaQuery.isError || accessQuery.isError || bodyQuery.isError || assetsQuery.isError,
    error: metaQuery.error ?? accessQuery.error ?? bodyQuery.error ?? assetsQuery.error,
  };
}
