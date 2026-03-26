/** Central TanStack Query keys for targeted invalidation and caching. */

export const eventKeys = {
  detail: (eventId: string) => ["event", eventId] as const,
  checklist: (eventId: string) => ["event", eventId, "checklist"] as const,
  documents: (eventId: string) => ["event", eventId, "documents"] as const,
  comments: (eventId: string) => ["event", eventId, "comments"] as const,
  media: (eventId: string) => ["event", eventId, "media"] as const,
  eventVendors: (eventId: string) => ["event", eventId, "event-vendors"] as const,
  /** Org-wide vendor directory (shared across events). */
  orgVendors: () => ["vendors", "org"] as const,
  /** Active (non-archived) events for budget form / comparisons. */
  orgEventsActive: () => ["events", "active"] as const,
};

export const dashboardKeys = {
  /** Invalidate all dashboard-scoped queries. */
  all: () => ["dashboard"] as const,
  eventsActive: () => ["dashboard", "events", "active"] as const,
  checklistStats: (eventIdsKey: string) =>
    ["dashboard", "checklist-stats", eventIdsKey] as const,
  monthlyBudgets: (budgetMonth: string) =>
    ["dashboard", "monthly-budgets", budgetMonth] as const,
};

export const vendorKeys = {
  list: () => ["vendors", "list"] as const,
  detail: (vendorId: string) => ["vendor", vendorId] as const,
  participationHistory: (vendorId: string) =>
    ["vendor", vendorId, "participation"] as const,
};

export const adminKeys = {
  managedUsers: () => ["admin", "managed-users"] as const,
};
