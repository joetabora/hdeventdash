export type UserRole = "admin" | "manager" | "staff";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  /** Default SPM / art request form URL (per-event override in playbook_marketing). */
  marketing_art_form_url?: string | null;
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
  /** Display-only venue label */
  location: string;
  /** Canonical venue key for budgets, filters, and caps */
  location_key: string;
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
  /** Planned / actual spend (optional until budgets migration) */
  planned_budget?: number | null;
  actual_budget?: number | null;
  /** Event Purpose & Goals (playbook) */
  event_goals?: string | null;
  /** Core Activities from Event Framework (playbook) */
  core_activities?: string | null;
  /** Giveaway description (playbook promotions) */
  giveaway_description?: string | null;
  /** Link to giveaway/QR site (e.g. Mixer) */
  giveaway_link?: string | null;
  /** RSVP incentive description */
  rsvp_incentive?: string | null;
  /** Link to RSVP site */
  rsvp_link?: string | null;
  /** Whether this event includes a swap meet section */
  has_swap_meet?: boolean;
  /**
   * Playbook marketing & publishing payload (see `playbookMarketingSchema`).
   * Typed in app via `getPlaybookMarketing` in `@/lib/playbook-marketing`.
   */
  playbook_marketing?: unknown | null;
}

/** Org cap for a calendar month and location_key (matches event.location_key). */
export interface MonthlyBudget {
  id: string;
  organization_id: string;
  /** First day of month, e.g. 2025-03-01 */
  month: string;
  /** Display-only label for this cap */
  location: string;
  /** Canonical venue key (same normalization as events.location_key) */
  location_key: string;
  budget_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  event_id: string;
  section: string;
  label: string;
  is_checked: boolean;
  assignee: string | null;
  comment: string | null;
  /** Optional estimated spend for this line item (managers); counts toward monthly venue cap with planned_budget. */
  estimated_cost: number | null;
  sort_order: number;
  created_at: string;
}

export type DocumentTag =
  | "contract"
  | "invoice"
  | "flyer"
  | "photo"
  | "receipt"
  | "w9"
  | "liability_waiver"
  | "layout"
  | "other";

export const DOCUMENT_TAGS: { value: DocumentTag; label: string }[] = [
  { value: "contract", label: "Contract" },
  { value: "invoice", label: "Invoice" },
  { value: "flyer", label: "Flyer" },
  { value: "photo", label: "Photo" },
  { value: "receipt", label: "Receipt" },
  { value: "w9", label: "W-9" },
  { value: "liability_waiver", label: "Liability Waiver" },
  { value: "layout", label: "Layout / Floor Plan" },
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

export const VENDOR_CATEGORY_PRESETS = [
  "Food Truck",
  "Entertainment / Band",
  "Merchandise Vendor",
  "Charity / Nonprofit",
  "Other",
] as const;

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
  agreed_fee: number | null;
  fee_notes: string;
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

export type SwapMeetSpotSize = "10x10" | "10x20";

export const SWAP_MEET_SPOT_SIZES: { value: SwapMeetSpotSize; label: string }[] = [
  { value: "10x10", label: "10×10" },
  { value: "10x20", label: "10×20" },
];

export interface SwapMeetSpot {
  id: string;
  event_id: string;
  name: string;
  phone: string;
  email: string;
  spot_size: SwapMeetSpotSize;
  waiver_file_path: string | null;
  waiver_file_name: string | null;
  created_at: string;
}

export const CHECKLIST_SECTIONS = [
  "Pre-Event Preparation",
  "Checklist / Materials",
  "Event Week Flow",
  "Post-Event Follow-Up",
  "Roles & Responsibilities",
  "Metrics for Success",
] as const;

export type ChecklistSection = (typeof CHECKLIST_SECTIONS)[number];

export const DEFAULT_CHECKLIST_ITEMS: Record<ChecklistSection, string[]> = {
  "Pre-Event Preparation": [
    "Finalize theme & core activities",
    "Secure outside vendors (food truck, band, charity, etc.)",
    "Entertainment/Music booked",
    "Catering/food vendor confirmed",
    "Merchant vendor confirmed",
    "Decor/Misc materials sourced",
    "Permits/approvals submitted (food, music, raffles)",
    "Request marketing assets from Chryssi/SPM (dates, details, media types)",
    "Flyer created (print & digital)",
    "Social media graphics created (FB/IG, stories, reels)",
    "CRM email segment prepared",
    "Website event listing updated with SEO description",
    "Event → Website: proofread summary, SEO title, and meta description in the page builder",
    "Event → Website: upload hero/web banners and verify mobile + desktop layouts",
    "Event → Website: publish (or schedule) and copy the final public URL into Marketing & publish",
    "Event → Facebook: create the FB event with correct date, time, and address",
    "Event → Facebook: add cover + key graphics; pin essentials in discussion if needed",
    "Share event details with team managers",
    "Assign staff roles (grill, games, raffles, etc.)",
    "Create layout (indoor/outdoor) and present to managers",
  ],
  "Checklist / Materials": [
    "Tent",
    "Tables",
    "Tablecloths",
    "Chairs",
    "FB graphic (1200×1200) posted",
    "IG graphic (1080×1920) posted",
    "Web banner",
    "Email graphic",
    "Email script",
    "Phone script",
    "Text script",
    "Text blast sent",
    "Motorcycle staged",
    "Flyers printed",
    "Bounce back cash",
    "Giveaway keyword set up",
    "Giveaway item",
    "Other swag",
    "iPad",
    "Poster sign/holder",
    "Guitar",
    "Balloons",
    "Flags",
  ],
  "Event Week Flow": [
    "Monday: Post 'This Week at HD' teaser on socials",
    "Tuesday: Send CRM email blast",
    "Tuesday: Place catering/DoorDash orders",
    "Wednesday: Push mid-week teaser ('3 Days Away!')",
    "Friday: 'Happening Tomorrow' post + reminder email",
    "Friday: Confirm vendors and deliveries",
    "Friday: Prepare prize, table & signage",
    "Saturday setup: Tents",
    "Saturday setup: Grill",
    "Saturday setup: Tables & signage",
    "Saturday setup: Prize entry station",
    "Saturday: Staff reminders sent",
    "Saturday: Capture photo/video content",
  ],
  "Post-Event Follow-Up": [
    "Within 24h: Post event photos/videos ('Thanks for riding out!')",
    "Within 24h: Collect raffle entries & track leads in CRM",
    "Within 3 days: Send follow-up email (thanks + promote next event)",
    "Manager meeting: Share recap (attendance, leads, sales impact)",
  ],
  "Roles & Responsibilities": [
    "Marketing lead assigned",
    "Sales team roles assigned",
    "Service team roles assigned",
    "MotorClothes team roles assigned",
    "GM/Owner briefed",
    "Volunteers/charities confirmed",
  ],
  "Metrics for Success": [
    "Event attendance (foot traffic) recorded",
    "Leads captured (entries/keywords collected)",
    "Sales lift tracked (MotorClothes, Parts, Sales during event)",
    "Social media engagement reviewed (reach, comments, shares)",
    "Customer feedback collected",
  ],
};
