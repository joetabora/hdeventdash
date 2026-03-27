import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEvents } from "@/lib/events";
import { getUserRole, canManageEventsRole } from "@/lib/roles";
import { NewEventClient } from "./new-event-client";

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const role = await getUserRole(supabase, user.id);
  if (!canManageEventsRole(role)) {
    redirect("/dashboard");
  }

  const data = await getEvents(supabase);
  const initialAllEvents = data.filter((e) => !e.is_archived);

  return <NewEventClient initialAllEvents={initialAllEvents} />;
}
