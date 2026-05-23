import type {
  ChecklistItem,
  Event,
  EventDocument,
  EventMedia,
  EventVendorWithVendor,
  SwapMeetSpot,
} from "@/types/database";

/** Serializable bundle passed from the report route (same sources as event detail). */
export type EventReportDataBundle = {
  event: Event;
  checklist: ChecklistItem[];
  documents: EventDocument[];
  media: EventMedia[];
  eventVendors: EventVendorWithVendor[];
  swapMeetSpots: SwapMeetSpot[];
  organizationName: string | null;
};

export type EventReportKeyValue = {
  label: string;
  value: string;
};

export type EventReportChecklistRow = {
  label: string;
  checked: boolean;
  assignee?: string;
  comment?: string;
  estimatedCost?: string;
};

export type EventReportVendorRow = {
  name: string;
  role: string;
  status: string;
  fee?: string;
  contact?: string;
  notes?: string;
};

export type EventReportLineItem = {
  name: string;
  description?: string;
  cost?: string;
};

export type EventReportImageRef = {
  mediaId: string;
  caption: string;
  filePath: string;
};

export type EventReportSection =
  | { id: "overview"; title: string; rows: EventReportKeyValue[] }
  | { id: "description"; title: string; body: string }
  | { id: "goals"; title: string; goals?: string; coreActivities?: string }
  | {
      id: "schedule";
      title: string;
      groups: { heading: string; items: EventReportChecklistRow[] }[];
    }
  | { id: "staffing"; title: string; rows: EventReportKeyValue[] }
  | { id: "vendors"; title: string; rows: EventReportVendorRow[] }
  | { id: "sponsors"; title: string; rows: EventReportVendorRow[] }
  | { id: "budget"; title: string; rows: EventReportKeyValue[]; lineItems: EventReportLineItem[] }
  | { id: "kpis"; title: string; rows: EventReportKeyValue[]; highlight?: string }
  | { id: "marketing"; title: string; blocks: { heading: string; body: string }[] }
  | { id: "logistics"; title: string; rows: EventReportKeyValue[]; materials: EventReportChecklistRow[] }
  | { id: "safety"; title: string; items: string[] }
  | { id: "materials"; title: string; items: EventReportChecklistRow[] }
  | { id: "swapMeet"; title: string; spots: { name: string; size: string; contact: string }[] }
  | { id: "notes"; title: string; planning?: string; recap?: string }
  | { id: "images"; title: string; images: EventReportImageRef[] }
  | { id: "analytics"; title: string; rows: EventReportKeyValue[] };

export type EventReportModel = {
  generatedAtIso: string;
  organizationName: string | null;
  eventTitle: string;
  eventStatusLabel: string;
  eventTypeLabel: string | null;
  sections: EventReportSection[];
};
