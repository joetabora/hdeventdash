"use client";

import { EventVendorsSection } from "@/components/vendors/event-vendors-section";
import type { EventVendorWithVendor } from "@/types/database";

export function EventVendorsModuleInner({
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
    <EventVendorsSection
      eventId={eventId}
      eventVendors={eventVendors}
      onUpdate={onEventVendorsInvalidate}
      canMutate={canMutate}
    />
  );
}
