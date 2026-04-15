"use client";

import { Check } from "lucide-react";

export function SavedCheck({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-harley-success text-[10px] font-medium animate-fade-in-up select-none">
      <Check className="w-3 h-3" />
      Saved
    </span>
  );
}
