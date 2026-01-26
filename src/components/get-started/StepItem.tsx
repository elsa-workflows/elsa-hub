import { ReactNode } from "react";

interface StepItemProps {
  number: number;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}

export function StepItem({ number, title, description, children }: StepItemProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
          {number}
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      {description && (
        <div className="text-muted-foreground ml-14">{description}</div>
      )}
      {children && <div className="ml-14">{children}</div>}
    </div>
  );
}
