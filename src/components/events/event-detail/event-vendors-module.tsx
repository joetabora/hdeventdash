"use client";

import { Vendor, EventVendorWithVendor } from "@/types/database";
import { Store } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";
import { DynamicEventVendorsModuleInner } from "./lazy-event-detail-components";

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
      key={`vendors-${eventId}`}
      icon={<Store className="w-4.5 h-4.5" />}
      title="Vendors"
      count={eventVendors.length}
      autoOpenOnDesktop
      mobileCollapsed
      deferHeavyContent
    >
      <DynamicEventVendorsModuleInner
        eventId={eventId}
        eventVendors={eventVendors}
        allVendors={allVendors}
        canMutate={canMutate}
        onEventVendorsInvalidate={onEventVendorsInvalidate}
      />
    </CollapsibleSection>
  );
}
