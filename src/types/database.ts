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

export interface Event {
  id: string;
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
