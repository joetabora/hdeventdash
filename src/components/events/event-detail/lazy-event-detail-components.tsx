"use client";

import dynamic from "next/dynamic";

function chunkSkeleton() {
  return (
    <div
      className="rounded-xl border border-harley-gray/40 bg-harley-gray/10 min-h-[7rem] animate-pulse"
      aria-hidden
    />
  );
}

export const DynamicAiAssistant = dynamic(
  () =>
    import("@/components/events/ai-assistant").then((m) => m.AiAssistant),
  { ssr: false, loading: chunkSkeleton }
);

export const DynamicEventRoiSection = dynamic(
  () =>
    import("@/components/events/event-roi-section").then(
      (m) => m.EventRoiSection
    ),
  { ssr: false, loading: chunkSkeleton }
);

export const DynamicEventMediaModuleInner = dynamic(
  () =>
    import("./event-media-module-inner").then((m) => m.EventMediaModuleInner),
  { ssr: false, loading: chunkSkeleton }
);

export const DynamicEventVendorsModuleInner = dynamic(
  () =>
    import("./event-vendors-module-inner").then(
      (m) => m.EventVendorsModuleInner
    ),
  { ssr: false, loading: chunkSkeleton }
);
