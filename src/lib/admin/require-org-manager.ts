import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionOrganizationId } from "@/lib/organization-server";
import { getUserRole, canManageEventsRole } from "@/lib/roles";
import type { User } from "@supabase/supabase-js";

export type OrgManagerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  /** Active org for this request (cookie + membership). */
  organizationId: string;
};

export async function getOrgManagerContext(): Promise<
  { ok: true } & OrgManagerContext | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const organizationId = await getSessionOrganizationId(supabase);
  if (!organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No organization membership." },
        { status: 400 }
      ),
    };
  }

  const role = await getUserRole(supabase, user.id, organizationId);
  if (!canManageEventsRole(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, supabase, user, organizationId };
}
