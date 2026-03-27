"use client";

import { EventVendorsSection } from "@/components/vendors/event-vendors-section";
import type { EventVendorWithVendor, Vendor } from "@/types/database";

export function EventVendorsModuleInner({
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
    <EventVendorsSection
      eventId={eventId}
      eventVendors={eventVendors}
      allVendors={allVendors}
      onUpdate={onEventVendorsInvalidate}
      canMutate={canMutate}
    />
  );
}
