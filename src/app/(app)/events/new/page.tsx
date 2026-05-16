import { redirect } from "next/navigation";
import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import { getEventBudgetSummariesForMonth } from "@/lib/events";
import { getUserRole, canManageEventsRole } from "@/lib/roles";
import { NewEventClient } from "./new-event-client";

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function NewEventPage() {
  const { supabase, user, sessionOrgId: organizationId } =
    await getCachedOrganizationSession();

  if (!user) {
    redirect("/auth/login");
  }
  if (!organizationId) {
    redirect("/dashboard");
  }

  const role = await getUserRole(supabase, user.id, organizationId);
  if (!canManageEventsRole(role)) {
    redirect("/dashboard");
  }

  const budgetMonth = currentYearMonth();
  const initialBudgetPeers = await getEventBudgetSummariesForMonth(
    supabase,
    budgetMonth
  );

  return (
    <NewEventClient initialBudgetPeers={initialBudgetPeers} />
  );
}
