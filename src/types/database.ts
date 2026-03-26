export type UserRole = "admin" | "manager" | "staff";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  created_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  created_at: string;
}

export type EventStatus =
  | "idea"
  | "planning"
  | "in_progress"
  | "ready_for_execution"
  | "live_event"
  | "completed";

export const EVENT_STATUSES: { value: EventStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "ready_for_execution", label: "Ready for Execution" },
  { value: "live_event", label: "Live Event" },
  { value: "completed", label: "Completed" },
];

export type EventType =
  | "ride"
  | "open_house"
  | "demo_day"
  | "community"
  | "sales_promo"
  | "fundraiser"
  | "other";

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "ride", label: "Group ride" },
  { value: "open_house", label: "Open house" },
  { value: "demo_day", label: "Demo / test ride day" },
  { value: "community", label: "Community / charity" },
  { value: "sales_promo", label: "Sales / promo event" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "other", label: "Other" },
];

export interface Event {
  id: string;
  organization_id: string;
  name: string;
  date: string;
  location: string;
  owner: string;
  status: EventStatus;
  description: string;
  onedrive_link: string | null;
  is_live_mode: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  attendance: number | null;
  recap_notes: string | null;
  sales_estimate: number | null;
  is_archived: boolean;
  /** ROI / outcome tracking (null/omitted until migration applied) */
  roi_leads_generated?: number | null;
  roi_bikes_sold?: number | null;
  roi_service_revenue?: number | null;
  roi_motorclothes_revenue?: number | null;
  roi_bike_sales_revenue?: number | null;
  roi_event_cost?: number | null;
  /** Analytics segment (optional until migration) */
  event_type?: EventType | null;
}

export interface ChecklistItem {
  id: string;
  event_id: string;
  section: string;
  label: string;
  is_checked: boolean;
  assignee: string | null;
  comment: string | null;
  sort_order: number;
  created_at: string;
}

export type DocumentTag =
  | "contract"
  | "invoice"
  | "flyer"
  | "photo"
  | "receipt"
  | "other";

export const DOCUMENT_TAGS: { value: DocumentTag; label: string }[] = [
  { value: "contract", label: "Contract" },
  { value: "invoice", label: "Invoice" },
  { value: "flyer", label: "Flyer" },
  { value: "photo", label: "Photo" },
  { value: "receipt", label: "Receipt" },
  { value: "other", label: "Other" },
];

export interface EventDocument {
  id: string;
  event_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  tag: DocumentTag;
  uploaded_by: string;
  created_at: string;
}

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

export type MediaTag = "social_media" | "recap" | "marketing_asset";

export const MEDIA_TAGS: { value: MediaTag; label: string }[] = [
  { value: "social_media", label: "Social Media" },
  { value: "recap", label: "Recap" },
  { value: "marketing_asset", label: "Marketing Asset" },
];

export interface EventMedia {
  id: string;
  event_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  tag: MediaTag;
  uploaded_by: string;
  created_at: string;
}

export type VendorParticipationStatus =
  | "invited"
  | "confirmed"
  | "participated"
  | "declined"
  | "cancelled";

export const VENDOR_PARTICIPATION_STATUSES: {
  value: VendorParticipationStatus;
  label: string;
}[] = [
  { value: "invited", label: "Invited" },
  { value: "confirmed", label: "Confirmed" },
  { value: "participated", label: "Participated" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
];

/** Organization vendor directory entry */
export interface Vendor {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  category: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Link between an event and a vendor (row kept for participation history when detached). */
export interface EventVendor {
  id: string;
  event_id: string;
  vendor_id: string;
  role: string;
  participation_status: VendorParticipationStatus;
  notes: string;
  detached_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventVendorWithVendor extends EventVendor {
  vendor: Vendor;
}

export interface EventVendorWithEvent extends EventVendor {
  event: Pick<Event, "id" | "name" | "date" | "status" | "location">;
}

export const CHECKLIST_SECTIONS = [
  "Booking & Logistics",
  "Marketing & Promotion",
  "Internal Alignment",
  "Sales & Experience",
] as const;

export type ChecklistSection = (typeof CHECKLIST_SECTIONS)[number];

export const DEFAULT_CHECKLIST_ITEMS: Record<ChecklistSection, string[]> = {
  "Booking & Logistics": [
    "Venue booked and confirmed",
    "Permits and licenses secured",
    "Insurance coverage verified",
    "Equipment rental arranged",
    "Catering/food vendors confirmed",
    "Transportation/parking plan set",
  ],
  "Marketing & Promotion": [
    "Event flyer/graphics created",
    "Social media posts scheduled",
    "Email blast sent to mailing list",
    "Local media/press outreach done",
    "Signage and banners prepared",
    "Website/landing page updated",
  ],
  "Internal Alignment": [
    "Staff roles and shifts assigned",
    "Pre-event team meeting scheduled",
    "Volunteer coordination complete",
    "Emergency/safety plan reviewed",
    "Communication channels set up",
  ],
  "Sales & Experience": [
    "Product inventory prepared",
    "POS/payment systems tested",
    "Demo bikes/products staged",
    "Customer experience flow mapped",
    "Giveaways/swag prepared",
    "Follow-up plan for leads defined",
  ],
};
