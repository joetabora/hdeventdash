import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind classes with conflict resolution.
 */
export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}
