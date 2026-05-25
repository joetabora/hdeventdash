"use client";

import { EventPlaybookPrintDocument } from "@/components/events/event-detail/event-playbook-print-document";
import type {
  Event,
  EventMedia,
  EventVendorWithVendor,
  SwapMeetSpot,
} from "@/types/database";

/** Read-only playbook for staff / view-only roles — replaces the editable form. */
export function EventPlaybookReadOnlyView({
  event,
  eventMedia,
  orgMarketingArtFormUrl,
  swapMeetSpots,
  eventVendors,
}: {
  event: Event;
  eventMedia: EventMedia[];
  orgMarketingArtFormUrl?: string | null;
  swapMeetSpots: SwapMeetSpot[];
  eventVendors: EventVendorWithVendor[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-harley-text-muted rounded-lg border border-border-subtle/50 bg-harley-black/25 px-3 py-2.5 leading-relaxed">
        You have <span className="text-harley-text">view-only</span> access to
        this playbook. Use the phase tabs above (Market, Week, Supporting, etc.)
        for checklists, vendors, and media. Contact a manager to request edits.
        If you should have edit access, an admin can update your role under{" "}
        <span className="text-harley-text">Admin → Users</span>.
      </p>
      <div className="rounded-lg border border-border-subtle/40 overflow-hidden max-h-[min(70vh,48rem)] overflow-y-auto bg-white">
        <EventPlaybookPrintDocument
          event={event}
          eventMedia={eventMedia}
          orgMarketingArtFormUrl={orgMarketingArtFormUrl ?? null}
          swapMeetSpots={swapMeetSpots}
          eventVendors={eventVendors}
        />
      </div>
    </div>
  );
}
