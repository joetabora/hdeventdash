import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicRegistrationSchema } from "@/lib/validation/event-mutation-schemas";
import { readJsonBody } from "@/lib/validation/request-json";

export const runtime = "nodejs";

/**
 * POST /api/public/events/[slug]/register — public RSVP (no auth).
 * Validation + capacity checks happen inside the register_for_event RPC,
 * which row-locks the event so concurrent submissions can't oversell it.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = publicRegistrationSchema.safeParse(raw.body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 }
    );
  }

  // Honeypot tripped: pretend success without writing anything.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true, confirmation_code: "OK" });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "unavailable" },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await admin.rpc("register_for_event", {
      p_slug: decodeURIComponent(slug),
      p_name: parsed.data.name,
      p_email: parsed.data.email,
      p_phone: parsed.data.phone,
      p_party_size: parsed.data.party_size,
    });
    if (error) throw error;

    const result = data as {
      ok: boolean;
      error?: string;
      remaining?: number;
      confirmation_code?: string;
    };

    if (!result.ok) {
      const status =
        result.error === "not_found"
          ? 404
          : result.error === "capacity" || result.error === "already_registered"
            ? 409
            : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/public/events/[slug]/register:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
