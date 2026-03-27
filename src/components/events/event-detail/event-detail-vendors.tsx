"use client";

import { EventVendorsModule } from "@/components/events/event-detail/event-vendors-module";
import type { EventVendorWithVendor } from "@/types/database";

export function EventDetailVendors({
  eventId,
  eventVendors,
  canMutate,
  onEventVendorsInvalidate,
}: {
  eventId: string;
  eventVendors: EventVendorWithVendor[];
  canMutate: boolean;
  onEventVendorsInvalidate: () => void;
}) {
  return (
    <EventVendorsModule
      eventId={eventId}
      eventVendors={eventVendors}
      canMutate={canMutate}
      onEventVendorsInvalidate={onEventVendorsInvalidate}
    />
  );
}
