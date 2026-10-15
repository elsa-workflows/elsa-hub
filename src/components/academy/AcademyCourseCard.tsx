import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  coursePath,
  formatAcademyPrice,
  handleBuyCourse,
  type Course,
} from "@/lib/academy";

type AcademyCourseCardProps = {
  course: Course;
  entitled: boolean;
  onBuyCourse?: typeof handleBuyCourse;
};

export function AcademyCourseCard({
  course,
  entitled,
  onBuyCourse = handleBuyCourse,
}: AcademyCourseCardProps) {
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
      <CardContent className="mt-auto">
        <p className="text-lg font-semibold">{formatAcademyPrice(course.price_cents, course.currency)}</p>
      </CardContent>
      <CardFooter>
        {entitled ? (
          <Button asChild className="w-full">
            <Link to={href}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button type="button" className="w-full" onClick={() => onBuyCourse(course)}>
            Buy
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
