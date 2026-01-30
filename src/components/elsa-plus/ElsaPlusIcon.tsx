import { cn } from "@/lib/utils";

interface ElsaPlusIconProps {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  hero: "h-12 w-12",
};

export function ElsaPlusIcon({ size = "md", className }: ElsaPlusIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], "text-primary", className)}
      aria-hidden="true"
    >
      <path
        d="M12 4v16M4 12h16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
