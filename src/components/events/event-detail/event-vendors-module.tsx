"use client";

import { EventVendorWithVendor } from "@/types/database";
import { Store } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";
import { DynamicEventVendorsModuleInner } from "./lazy-event-detail-components";

export function EventVendorsModule({
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
        canMutate={canMutate}
        onEventVendorsInvalidate={onEventVendorsInvalidate}
      />
    </CollapsibleSection>
  );
}
