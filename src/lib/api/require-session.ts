import { NextResponse } from "next/server";
import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionContext = {
  supabase: SupabaseClient;
  user: User;
  organizationId: string | null;
};

export async function requireSession(req?: Request): Promise<
  { ok: true } & SessionContext | { ok: false; response: NextResponse }
> {
  /**
   * 🔓 INTERNAL AI BYPASS (Docker → Ollama → API)
   */
  const internalSecret = req?.headers?.get("x-ai-secret");

  if (
    internalSecret &&
    process.env.AI_INTERNAL_SECRET &&
    internalSecret === process.env.AI_INTERNAL_SECRET
  ) {
    return {
      ok: true,
      supabase: {} as SupabaseClient,
      user: {
        id: "internal",
        email: "internal@system",
      } as User,
      organizationId: null,
    };
  }

  /**
   * NORMAL AUTH FLOW
   */
  const { supabase, user, sessionOrgId: organizationId } =
    await getCachedOrganizationSession();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { ok: true, supabase, user, organizationId };
}
