import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import { getEventsForDashboard } from "@/lib/events";
import { listOpsFeedEntries } from "@/lib/ops-feed";
import { enrichOpsFeedEntries } from "@/lib/ops-feed-utils";
import { OpsFeedClient } from "./ops-feed-client";

const PAGE_SIZE = 30;

export default async function OpsFeedPage() {
  const { supabase, sessionOrgId: orgId } = await getCachedOrganizationSession();

  const [feedPage, events] = await Promise.all([
    orgId
      ? listOpsFeedEntries(supabase, orgId, {
          page: 1,
          pageSize: PAGE_SIZE,
          search: "",
          tag: "",
          priority: "",
          dateFrom: "",
          dateTo: "",
          status: "active",
        }).catch(() => ({
          entries: [],
          total: 0,
          page: 1,
          pageSize: PAGE_SIZE,
          availableTags: [] as string[],
        }))
      : Promise.resolve({
          entries: [],
          total: 0,
          page: 1,
          pageSize: PAGE_SIZE,
          availableTags: [] as string[],
        }),
    orgId
      ? getEventsForDashboard(supabase, orgId).catch(() => [])
      : Promise.resolve([]),
  ]);

  const clientKey = [
    orgId ?? "",
    feedPage.total,
    ...feedPage.entries.map((e) => `${e.id}:${e.updated_at}`),
  ].join("\u0001");

  return (
    <OpsFeedClient
      key={clientKey}
      initialEntries={enrichOpsFeedEntries(feedPage.entries, events)}
      initialTotal={feedPage.total}
      initialAvailableTags={feedPage.availableTags}
      events={events}
    />
  );
}
