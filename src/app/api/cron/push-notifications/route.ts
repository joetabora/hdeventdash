import { timingSafeEqual } from "crypto";
import type { Message } from "firebase-admin/messaging";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFirebaseAdminMessaging } from "@/lib/firebase/admin-app";
import {
  evaluateEventNotifications,
  getNotificationCandidateDateRange,
  PUSH_REMINDER_EVENT_STATUSES,
  type EventRow,
  type EvaluatedNotification,
} from "@/lib/push/cron-evaluate";

export const runtime = "nodejs";
export const maxDuration = 60;

function bearerMatchesSecret(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.slice(7).trim();
  if (!token) return false;
  try {
    const a = Buffer.from(token, "utf8");
    const b = Buffer.from(secret, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return bearerMatchesSecret(request.headers.get("authorization"), secret);
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

function sentKey(eventId: string, notificationKey: string): string {
  return `${eventId}\u0000${notificationKey}`;
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}

type PendingSend = {
  event: EventRow;
  n: EvaluatedNotification;
};

async function runCron() {
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

  const { start, end } = getNotificationCandidateDateRange();

  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("id, name, date, status, user_id")
    .eq("is_archived", false)
    .in("status", PUSH_REMINDER_EVENT_STATUSES)
    .gte("date", start)
    .lte("date", end);

  if (evErr) {
    return NextResponse.json({ error: evErr.message }, { status: 500 });
  }

  const eventList = (events ?? []) as EventRow[];
  if (eventList.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: 0,
      events: 0,
      message: "No events in notification window",
    });
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

  const pending: PendingSend[] = [];
  for (const event of eventList) {
    const s = stats.get(event.id) ?? { total: 0, done: 0 };
    for (const n of evaluateEventNotifications(event, s.total, s.done)) {
      pending.push({ event, n });
    }
  }

  if (pending.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: 0,
      events: eventList.length,
      message: "No notifications due",
    });
  }

  const pendingEventIds = [...new Set(pending.map((p) => p.event.id))];
  const { data: sentRows, error: sentErr } = await supabase
    .from("notification_sent")
    .select("event_id, notification_key")
    .in("event_id", pendingEventIds);

  if (sentErr) {
    return NextResponse.json({ error: sentErr.message }, { status: 500 });
  }

  const alreadySent = new Set(
    (sentRows ?? []).map((r) =>
      sentKey(r.event_id as string, r.notification_key as string)
    )
  );

  const notYetSent = pending.filter(
    (p) => !alreadySent.has(sentKey(p.event.id, p.n.notificationKey))
  );
  const skippedAlreadySent = pending.length - notYetSent.length;

  const userIds = [...new Set(notYetSent.map((p) => p.event.user_id))];
  const { data: tokenRows, error: tokErr } = await supabase
    .from("push_tokens")
    .select("user_id, token")
    .in("user_id", userIds);

  if (tokErr) {
    return NextResponse.json({ error: tokErr.message }, { status: 500 });
  }

  const tokenByUser = new Map<string, string>();
  for (const row of tokenRows ?? []) {
    const uid = row.user_id as string;
    const t = row.token as string;
    if (t) tokenByUser.set(uid, t);
  }

  const base = appBaseUrl();
  const messages: Message[] = [];
  const sendMeta: { eventId: string; notificationKey: string; userId: string }[] =
    [];

  let skippedNoToken = 0;
  for (const { event, n } of notYetSent) {
    const token = tokenByUser.get(event.user_id);
    if (!token) {
      skippedNoToken += 1;
      continue;
    }
    const link = base ? `${base}/events/${event.id}` : undefined;
    messages.push({
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
    });
    sendMeta.push({
      eventId: event.id,
      notificationKey: n.notificationKey,
      userId: event.user_id,
    });
  }

  if (messages.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: skippedAlreadySent + skippedNoToken,
      events: eventList.length,
    });
  }

  /** FCM sendEach allows up to 500 messages per call. */
  const FCM_BATCH = 500;
  const inserts: { event_id: string; notification_key: string }[] = [];
  const invalidUserIds = new Set<string>();
  let sent = 0;
  let skippedSend = 0;

  for (let off = 0; off < messages.length; off += FCM_BATCH) {
    const slice = messages.slice(off, off + FCM_BATCH);
    const metaSlice = sendMeta.slice(off, off + FCM_BATCH);
    const batch = await messaging.sendEach(slice);

    for (let i = 0; i < batch.responses.length; i++) {
      const r = batch.responses[i];
      const m = metaSlice[i];
      if (r.success) {
        sent += 1;
        inserts.push({
          event_id: m.eventId,
          notification_key: m.notificationKey,
        });
      } else {
        skippedSend += 1;
        const code =
          r.error?.code != null ? String(r.error.code) : "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token")
        ) {
          invalidUserIds.add(m.userId);
        }
      }
    }
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from("notification_sent").insert(inserts);
    if (insErr) {
      console.error("notification_sent batch insert:", insErr);
    }
  }

  if (invalidUserIds.size > 0) {
    const { error: delErr } = await supabase
      .from("push_tokens")
      .delete()
      .in("user_id", [...invalidUserIds]);
    if (delErr) {
      console.error("push_tokens cleanup:", delErr);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped: skippedAlreadySent + skippedNoToken + skippedSend,
    events: eventList.length,
  });
}
