import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getCachedOrganizationSession } from "@/lib/app-organization-session";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionContext = {
  supabase: SupabaseClient;
  user: User;
  organizationId: string | null;
};

/** Minimum length for AI_INTERNAL_SECRET — short secrets are rejected outright. */
const MIN_INTERNAL_SECRET_LENGTH = 32;

function matchesInternalSecret(header: string | null): boolean {
  const secret = process.env.AI_INTERNAL_SECRET;
  if (!header || !secret || secret.length < MIN_INTERNAL_SECRET_LENGTH) {
    return false;
  }
  try {
    const a = Buffer.from(header, "utf8");
    const b = Buffer.from(secret, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function requireSession(req?: Request): Promise<
  { ok: true } & SessionContext | { ok: false; response: NextResponse }
> {
  /**
   * 🔓 INTERNAL AI BYPASS (Docker → Ollama → API)
   * Only honored when AI_INTERNAL_SECRET is set server-side and at least
   * 32 chars; compared with timingSafeEqual to avoid timing attacks.
   */
  if (matchesInternalSecret(req?.headers?.get("x-ai-secret") ?? null)) {
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
