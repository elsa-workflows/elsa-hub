import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AcademyKitDownload } from "@/components/academy/AcademyKitDownload";
import { AcademyPaymentSuccessNote, AcademySoloCta } from "@/components/academy/AcademySoloCta";
import { AcademyMarkdown } from "@/components/academy/AcademyMarkdown";
import {
  AcademyEmptyState,
  AcademyErrorState,
  AcademyLoadingState,
  AcademyNotFoundState,
} from "@/components/academy/AcademyPageState";
import { useAcademyLesson } from "@/hooks/useAcademyLesson";
import {
  ACADEMY_PATH,
  coursePath,
  handleBuyCourse,
  lessonPath,
} from "@/lib/academy";
import { academyLessonDescription, academyLessonTitle } from "@/lib/academySeo";

export default function AcademyLesson() {
  const { courseSlug, lessonSlug } = useParams<{ courseSlug: string; lessonSlug: string }>();
  const navigate = useNavigate();
  const {
    course,
    lesson,
    bodyMd,
    assets,
    hasAccess,
    isPreview,
    canRead,
    authLoading,
    user,
    notFound,
    isLoading,
    isError,
    error,
  } = useAcademyLesson(courseSlug, lessonSlug);

  const currentPath =
    courseSlug && lessonSlug ? lessonPath(courseSlug, lessonSlug) : ACADEMY_PATH;

  useEffect(() => {
    if (authLoading || !lesson || isPreview) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
    }
  }, [authLoading, lesson, isPreview, user, navigate, currentPath]);

  if (isLoading || (lesson && !isPreview && !user)) {
    return (
      <Layout>
        <AcademyLoadingState label="Loading lesson..." />
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <AcademyErrorState
          title="Could not load this lesson"
          message={error instanceof Error ? error.message : undefined}
        />
      </Layout>
    );
  }

  if (notFound || !course || !lesson) {
    return (
      <Layout>
        <Seo
          path={currentPath}
          title="Lesson not found | Elsa Academy"
          description="This Academy lesson could not be found."
          noIndex
        />
        <AcademyNotFoundState
          title="Lesson not found"
          message="This lesson is missing or the address is wrong."
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <Seo
        path={currentPath}
        title={academyLessonTitle(lesson, course)}
        description={academyLessonDescription(lesson, course)}
        noIndex
      />

      <section className="pt-8 pb-4">
        <div className="container">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={ACADEMY_PATH}>Academy</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={coursePath(course.slug)}>{course.title}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{lesson.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      <article className="container max-w-3xl pb-20 space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">{lesson.title}</h1>
          {isPreview && (
            <p className="text-sm text-muted-foreground">Free preview lesson.</p>
          )}
          {hasAccess && <AcademyPaymentSuccessNote />}
        </header>

        {canRead ? (
          <>
            {bodyMd ? (
              <AcademyMarkdown markdown={bodyMd} />
            ) : (
              <AcademyEmptyState
                title="No content yet"
                message="This lesson has no content yet. Check back soon."
              />
            )}
            {hasAccess && <AcademyKitDownload assets={assets} title="Lesson files" />}
          </>
        ) : (
          <AcademySoloCta locked onBuyCourse={handleBuyCourse} />
        )}
      </article>
    </Layout>
  );
}
