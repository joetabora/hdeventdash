"use client";

import { EventVendorsModule } from "@/components/events/event-detail/event-vendors-module";
import type { EventVendorWithVendor } from "@/types/database";

export function EventDetailVendors({
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
    <EventVendorsModule
      eventId={eventId}
      eventVendors={eventVendors}
      canMutate={canMutate}
      onEventVendorsInvalidate={onEventVendorsInvalidate}
      onOptimisticPatch={onOptimisticPatch}
      onOptimisticRemove={onOptimisticRemove}
    />
  );
}
