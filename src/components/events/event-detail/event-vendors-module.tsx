"use client";

import { EventVendorsSection } from "@/components/vendors/event-vendors-section";
import { Vendor, EventVendorWithVendor } from "@/types/database";
import { Store } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";

export function EventVendorsModule({
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
    <CollapsibleSection
      icon={<Store className="w-4.5 h-4.5" />}
      title="Vendors"
      count={eventVendors.length}
      autoOpenOnDesktop
      mobileCollapsed
    >
      <EventVendorsSection
        eventId={eventId}
        eventVendors={eventVendors}
        allVendors={allVendors}
        onUpdate={onEventVendorsInvalidate}
        canMutate={canMutate}
      />
    </CollapsibleSection>
  );
}
