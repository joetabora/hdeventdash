import {
  VENDOR_PARTICIPATION_STATUSES,
  type VendorParticipationStatus,
} from "@/types/database";

export type VendorParticipationBadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "orange";

/** Maps participation status to `Badge` variant (event vendors + vendor history UI). */
export function vendorParticipationBadgeVariant(
  status: VendorParticipationStatus
): VendorParticipationBadgeVariant {
  switch (status) {
    case "participated":
      return "success";
    case "confirmed":
      return "muted";
    case "invited":
      return "warning";
    case "declined":
    case "cancelled":
      return "danger";
    default:
      return "default";
  }
}

/** Human-readable label for a participation status value. */
export function vendorParticipationLabel(
  status: VendorParticipationStatus
): string {
  return (
    VENDOR_PARTICIPATION_STATUSES.find((x) => x.value === status)?.label ??
    status
  );
}
