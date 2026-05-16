import { NextResponse } from "next/server";
import { getCachedOrganizationSession } from "@/lib/app-organization-session";
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
  const { supabase, user, sessionOrgId: organizationId } =
    await getCachedOrganizationSession();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, supabase, user, organizationId };
}
