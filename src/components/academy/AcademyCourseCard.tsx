import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { coursePath, type Course } from "@/lib/academy";

type AcademyCourseCardProps = {
  course: Course;
  entitled: boolean;
};

export function AcademyCourseCard({ course, entitled }: AcademyCourseCardProps) {
  const href = coursePath(course.slug);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-xl">
          <Link to={href} className="hover:text-primary transition-colors">
            {course.title}
          </Link>
        </CardTitle>
        {course.summary && <CardDescription>{course.summary}</CardDescription>}
      </CardHeader>
      {entitled && (
        <CardFooter>
          <Button asChild className="w-full">
            <Link to={href}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
