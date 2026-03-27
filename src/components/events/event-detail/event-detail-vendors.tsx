"use client";

import { EventVendorsModule } from "@/components/events/event-detail/event-vendors-module";
import type { Vendor, EventVendorWithVendor } from "@/types/database";

export function EventDetailVendors({
  eventId,
  eventVendors,
  allVendors,
  canMutate,
  onEventVendorsInvalidate,
}: {
  eventId: string;
  eventVendors: EventVendorWithVendor[];
  allVendors: Vendor[];
  canMutate: boolean;
  onEventVendorsInvalidate: () => void;
}) {
  return (
    <EventVendorsModule
      eventId={eventId}
      eventVendors={eventVendors}
      allVendors={allVendors}
      canMutate={canMutate}
      onEventVendorsInvalidate={onEventVendorsInvalidate}
    />
  );
}
