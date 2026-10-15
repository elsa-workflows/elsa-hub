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
import { AcademyPaymentSuccessNote, AcademySoloCta } from "@/components/academy/AcademySoloCta";
import { AcademyLessonList } from "@/components/academy/AcademyLessonList";
import {
  AcademyEmptyState,
  AcademyErrorState,
  AcademyLoadingState,
  AcademyNotFoundState,
} from "@/components/academy/AcademyPageState";
import { useAcademyCourse } from "@/hooks/useAcademyCourse";
import { ACADEMY_PATH, coursePath, formatAcademyPrice, handleBuyCourse } from "@/lib/academy";
import {
  academyCourseDescription,
  academyCourseJsonLd,
  academyCourseTitle,
} from "@/lib/academySeo";
import { SITE_URL } from "@/lib/site";

export default function AcademyCourse() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const { course, lessons, kitAssets, hasAccess, notFound, isLoading, isError, error } =
    useAcademyCourse(courseSlug);

  if (isLoading) {
    return (
      <Layout>
        <AcademyLoadingState label="Loading course..." />
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <AcademyErrorState
          title="Could not load this course"
          message={error instanceof Error ? error.message : undefined}
        />
      </Layout>
    );
  }

  if (notFound || !course) {
    return (
      <Layout>
        <Seo
          path={courseSlug ? coursePath(courseSlug) : ACADEMY_PATH}
          title="Course not found | Elsa Academy"
          description="This Academy course could not be found."
          noIndex
        />
        <AcademyNotFoundState
          title="Course not found"
          message="This course is unpublished or the address is wrong."
        />
      </Layout>
    );
  }

  const path = coursePath(course.slug);

  return (
    <Layout>
      <Seo
        path={path}
        title={academyCourseTitle(course)}
        description={academyCourseDescription(course)}
        jsonLd={academyCourseJsonLd(course, `${SITE_URL}${path}`)}
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
                <BreadcrumbPage>{course.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      <section className="container max-w-3xl pb-20 space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl font-bold">{course.title}</h1>
          {course.summary && <p className="text-lg text-muted-foreground">{course.summary}</p>}
          <p className="text-lg font-semibold">{formatAcademyPrice(course.price_cents, course.currency)}</p>
          {hasAccess && <p className="text-sm text-primary">You have access to this course.</p>}
          {hasAccess && <AcademyPaymentSuccessNote />}
        </header>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Lessons</h2>
          {lessons.length === 0 ? (
            <AcademyEmptyState
              title="No lessons yet"
              message="Lessons for this course will appear here when they are published."
            />
          ) : (
            <AcademyLessonList course={course} lessons={lessons} hasAccess={hasAccess} />
          )}
        </div>

        {hasAccess && <AcademyKitDownload assets={kitAssets} title="Downloads" />}

        {!hasAccess && <AcademySoloCta locked onBuyCourse={handleBuyCourse} />}
      </section>
    </Layout>
  );
}
