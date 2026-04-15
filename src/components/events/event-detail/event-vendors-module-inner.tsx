"use client";

import { EventVendorsSection } from "@/components/vendors/event-vendors-section";
import type { EventVendorWithVendor } from "@/types/database";

export function EventVendorsModuleInner({
  eventId,
  eventVendors,
  canMutate,
  onEventVendorsInvalidate,
  onOptimisticPatch,
  onOptimisticRemove,
}: {
  eventId: string;
  eventVendors: EventVendorWithVendor[];
  canMutate: boolean;
  onEventVendorsInvalidate: () => void;
  onOptimisticPatch?: (linkId: string, updates: Partial<EventVendorWithVendor>) => void;
  onOptimisticRemove?: (linkId: string) => void;
}) {
  return (
    <EventVendorsSection
      eventId={eventId}
      eventVendors={eventVendors}
      onUpdate={onEventVendorsInvalidate}
      canMutate={canMutate}
      onOptimisticPatch={onOptimisticPatch}
      onOptimisticRemove={onOptimisticRemove}
    />
  );
}
