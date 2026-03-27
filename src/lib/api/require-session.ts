import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionOrganizationId } from "@/lib/organization-server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionContext = {
  supabase: SupabaseClient;
  user: User;
  /** Resolved org for this request; null if the user has no membership. */
  organizationId: string | null;
};

export async function requireSession(): Promise<
  { ok: true } & SessionContext | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const organizationId = await getSessionOrganizationId(supabase);

  return { ok: true, supabase, user, organizationId };
}
