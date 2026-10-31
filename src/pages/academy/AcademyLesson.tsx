import { Link, useParams } from "react-router-dom";
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
import { AcademyKitStep } from "@/components/academy/AcademyKitStep";
import { AcademyLessonFrame } from "@/components/academy/AcademyLessonFrame";
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
  const {
    course,
    lesson,
    lessons,
    bodyMd,
    assets,
    kitAssets,
    hasAccess,
    isPreview,
    canRead,
    notFound,
    isLoading,
    isError,
    error,
  } = useAcademyLesson(courseSlug, lessonSlug);

  const currentPath =
    courseSlug && lessonSlug ? lessonPath(courseSlug, lessonSlug) : ACADEMY_PATH;

  // A signed-out visitor on a locked lesson stays here and gets the locked Solo CTA (Buy plus
  // Sign in). The lesson body is never fetched for them: canRead is false, and RLS gates it anyway.
  if (isLoading) {
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

      <AcademyLessonFrame
        course={course}
        lesson={lesson}
        lessons={lessons}
        hasAccess={hasAccess}
        canRead={canRead}
      >
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
                // The kit step lands after the first paragraph or list item whose text matches
                // ACADEMY_KIT_STEP_PATTERN (rehypeAcademyKitStep), so its placement depends on the
                // lesson wording: rewording that sentence moves or removes the button.
                <AcademyMarkdown
                  markdown={bodyMd}
                  kitStep={
                    <AcademyKitStep
                      hasAccess={hasAccess}
                      kitAssets={kitAssets}
                      onBuyCourse={() => handleBuyCourse(course.id)}
                    />
                  }
                />
              ) : (
                <AcademyEmptyState
                  title="No content yet"
                  message="This lesson has no content yet. Check back soon."
                />
              )}
              {hasAccess && <AcademyKitDownload assets={assets} title="Lesson files" />}
            </>
          ) : (
            <AcademySoloCta
              locked
              signedOutBuy
              onBuyCourse={() => handleBuyCourse(course.id)}
            />
          )}
        </article>
      </AcademyLessonFrame>
    </Layout>
  );
}
