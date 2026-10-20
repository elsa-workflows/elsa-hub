import { useLayoutEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { AcademyCourseCard } from "@/components/academy/AcademyCourseCard";
import {
  AcademyEmptyState,
  AcademyErrorState,
  AcademyLoadingState,
} from "@/components/academy/AcademyPageState";
import { AcademySoloCta } from "@/components/academy/AcademySoloCta";
import { useAcademyCatalog } from "@/hooks/useAcademyCatalog";
import {
  ACADEMY_PATH,
  ACADEMY_SOLO_BUNDLE_ID,
  handleBuyCourse,
  scrollAcademySoloBundleIntoView,
} from "@/lib/academy";
import { ACADEMY_DESCRIPTION, ACADEMY_TITLE, academyCatalogJsonLd } from "@/lib/academySeo";
import { SITE_URL } from "@/lib/site";

export default function AcademyCatalog() {
  const { hash } = useLocation();
  const { courses, myCourses, accessByCourseId, isLoading, isError, error } = useAcademyCatalog();

  // has_academy_access also grants via a single-course entitlement, a team seat or an admin, so
  // only access to every published course counts as owning the bundle.
  const ownership: "owned" | "unknown" | "none" =
    isLoading || isError
      ? "unknown"
      : courses.length > 0 && courses.every((course) => accessByCourseId[course.id])
        ? "owned"
        : "none";

  useLayoutEffect(() => {
    scrollAcademySoloBundleIntoView(hash);
  }, [hash, isLoading, isError, courses.length]);

  return (
    <Layout>
      <Seo
        path={ACADEMY_PATH}
        title={ACADEMY_TITLE}
        description={ACADEMY_DESCRIPTION}
        jsonLd={academyCatalogJsonLd(courses, SITE_URL)}
      />

      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Academy</h1>
            <p className="text-lg text-muted-foreground">{ACADEMY_DESCRIPTION}</p>
          </div>
        </div>
      </section>

      <section className="container max-w-5xl pb-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="space-y-12">
            {isLoading ? (
              <AcademyLoadingState label="Loading published courses..." />
            ) : isError ? (
              <AcademyErrorState
                message={error instanceof Error ? error.message : "The course catalogue could not be loaded."}
              />
            ) : (
              <>
                {myCourses.length > 0 && (
                  <div id="my-courses" className="space-y-4">
                    <h2 className="text-2xl font-bold">My courses</h2>
                    <div className="grid gap-6 sm:grid-cols-2">
                      {myCourses.map((course) => (
                        <AcademyCourseCard key={course.id} course={course} entitled />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Published courses</h2>
                  {courses.length === 0 ? (
                    <AcademyEmptyState
                      title="Courses are coming soon."
                      message="Published Academy courses will appear here once they are available."
                    />
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2">
                      {courses.map((course) => (
                        <AcademyCourseCard
                          key={course.id}
                          course={course}
                          entitled={Boolean(accessByCourseId[course.id])}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <AcademySoloCta
            id={ACADEMY_SOLO_BUNDLE_ID}
            ownership={ownership}
            onBuyCourse={handleBuyCourse}
          />
        </div>

        <p className="text-sm text-muted-foreground text-center mt-12">
          Looking for live workshops? See{" "}
          <Link to="/elsa-plus/training" className="text-primary hover:underline">
            Training
          </Link>
          .
        </p>
      </section>
    </Layout>
  );
}
