import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ACADEMY_TEAM_LICENCES_URL, handleBuyCourse } from "@/lib/academy";

type AcademySoloCtaProps = {
  id?: string;
  locked?: boolean;
  onBuyCourse?: typeof handleBuyCourse;
};

export function AcademySoloCta({
  id,
  locked = false,
  onBuyCourse = handleBuyCourse,
}: AcademySoloCtaProps) {
  return (
    <Card id={id} data-testid="academy-solo-cta">
      <CardHeader>
        {locked && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
            <Lock className="h-5 w-5 text-primary" />
          </div>
        )}
        <CardTitle>Solo Bundle</CardTitle>
        <CardDescription>
          {locked ? "Buy the Solo Bundle to unlock Academy lessons." : "Self-paced Academy access."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <Button type="button" onClick={() => onBuyCourse()}>
          Buy
        </Button>
        <a
          href={ACADEMY_TEAM_LICENCES_URL}
          className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
        >
          Team licences
        </a>
      </CardContent>
    </Card>
  );
}
