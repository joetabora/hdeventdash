import type { Event } from "@/types/database";
import type { ChecklistStats } from "@/lib/events";

function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const HEADERS = [
  "Name",
  "Date",
  "Status",
  "Type",
  "Location",
  "Owner",
  "Planned Budget",
  "Actual Budget",
  "Attendance",
  "Sales Estimate",
  "Leads Generated",
  "Bikes Sold",
  "Service Revenue",
  "MotorClothes Revenue",
  "Bike Sales Revenue",
  "Event Cost",
  "Checklist Completed",
  "Checklist Total",
];

/** Spreadsheet export of the dashboard's (filtered) events. */
export function eventsToCsv(
  events: Event[],
  checklistStats?: ChecklistStats
): string {
  const lines = [HEADERS.join(",")];
  for (const event of events) {
    const stats = checklistStats?.[event.id];
    lines.push(
      [
        csvCell(event.name),
        csvCell(event.date),
        csvCell(event.status),
        csvCell(event.event_type ?? ""),
        csvCell(event.location),
        csvCell(event.owner),
        csvCell(event.planned_budget ?? ""),
        csvCell(event.actual_budget ?? ""),
        csvCell(event.attendance ?? ""),
        csvCell(event.sales_estimate ?? ""),
        csvCell(event.roi_leads_generated ?? ""),
        csvCell(event.roi_bikes_sold ?? ""),
        csvCell(event.roi_service_revenue ?? ""),
        csvCell(event.roi_motorclothes_revenue ?? ""),
        csvCell(event.roi_bike_sales_revenue ?? ""),
        csvCell(event.roi_event_cost ?? ""),
        csvCell(stats?.completed ?? ""),
        csvCell(stats?.total ?? ""),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

/** Trigger a browser download of CSV content. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
