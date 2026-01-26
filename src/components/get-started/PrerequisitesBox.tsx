import { CheckCircle2 } from "lucide-react";

interface PrerequisitesBoxProps {
  items: string[];
}

export function PrerequisitesBox({ items }: PrerequisitesBoxProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-6">
      <h3 className="font-semibold mb-4">Prerequisites</h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
