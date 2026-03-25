import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFirebaseAdminMessaging } from "@/lib/firebase/admin-app";
import {
  evaluateEventNotifications,
  type EventRow,
} from "@/lib/push/cron-evaluate";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const q = request.nextUrl.searchParams.get("secret");
  return bearer === secret || q === secret;
}

function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "";
}

export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}

async function runCron(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const messaging = getFirebaseAdminMessaging();

  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 503 }
    );
  }
  if (!messaging) {
    return NextResponse.json(
      { error: "Firebase admin credentials not configured" },
      { status: 503 }
    );
  }

  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("id, name, date, status, user_id")
    .eq("is_archived", false);

  if (evErr) {
    return NextResponse.json({ error: evErr.message }, { status: 500 });
  }

  const eventList = (events ?? []) as EventRow[];
  if (eventList.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, message: "No events" });
  }

  const eventIds = eventList.map((e) => e.id);
  const { data: checklistRows, error: clErr } = await supabase
    .from("checklist_items")
    .select("event_id, is_checked")
    .in("event_id", eventIds);

  if (clErr) {
    return NextResponse.json({ error: clErr.message }, { status: 500 });
  }

  const stats = new Map<string, { total: number; done: number }>();
  for (const row of checklistRows ?? []) {
    const id = row.event_id as string;
    const s = stats.get(id) ?? { total: 0, done: 0 };
    s.total += 1;
    if (row.is_checked) s.done += 1;
    stats.set(id, s);
  }

  let sent = 0;
  let skipped = 0;
  const base = appBaseUrl();

  for (const event of eventList) {
    const s = stats.get(event.id) ?? { total: 0, done: 0 };
    const pending = evaluateEventNotifications(event, s.total, s.done);

    for (const n of pending) {
      const { data: existing } = await supabase
        .from("notification_sent")
        .select("id")
        .eq("event_id", event.id)
        .eq("notification_key", n.notificationKey)
        .maybeSingle();

      if (existing) {
        skipped += 1;
        continue;
      }

      const { data: tokenRow } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("user_id", event.user_id)
        .maybeSingle();

      const token = tokenRow?.token as string | undefined;
      if (!token) {
        skipped += 1;
        continue;
      }

      const link = base ? `${base}/events/${event.id}` : undefined;

      try {
        const message: Parameters<typeof messaging.send>[0] = {
          token,
          notification: { title: n.title, body: n.body },
          data: {
            eventId: event.id,
            kind: n.kind,
            link: link || "",
          },
          webpush: link
            ? {
                fcmOptions: { link },
              }
            : undefined,
        };

        await messaging.send(message);

        await supabase.from("notification_sent").insert({
          event_id: event.id,
          notification_key: n.notificationKey,
        });

        sent += 1;
      } catch (e: unknown) {
        const code =
          e && typeof e === "object" && "code" in e
            ? String((e as { code?: string }).code)
            : "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token")
        ) {
          await supabase.from("push_tokens").delete().eq("user_id", event.user_id);
        }
        skipped += 1;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    events: eventList.length,
  });
}
