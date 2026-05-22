import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  /** For screen readers */
  label?: string;
}

export function Skeleton({ className, label }: SkeletonProps) {
  return (
    <span
      className={cn(
        "block animate-pulse rounded-md bg-harley-gray/35",
        className
      )}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}
