import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAcademyPrice, handleBuyCourse, type Course } from "@/lib/academy";

type AcademyBuyPanelProps = {
  course: Course;
  onBuyCourse?: typeof handleBuyCourse;
};

export function AcademyBuyPanel({ course, onBuyCourse = handleBuyCourse }: AcademyBuyPanelProps) {
  return (
    <Card data-testid="academy-buy-panel">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <CardTitle>This lesson is locked</CardTitle>
        <CardDescription>
          Buy {course.title} to read the full lesson body and download the kit.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg font-semibold">{formatAcademyPrice(course.price_cents, course.currency)}</p>
        <Button type="button" onClick={() => onBuyCourse(course)}>
          Buy
        </Button>
      </CardContent>
    </Card>
  );
}
