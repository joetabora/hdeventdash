import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";

import { loadPublicEvent, isRegistrationOpen } from "@/lib/public-event";
import { spotsRemaining } from "@/lib/registration";
import { PublicRegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadPublicEvent(decodeURIComponent(slug));
  if (!event) return { title: "Event not found" };
  return {
    title: `${event.name} — RSVP`,
    description: event.description?.slice(0, 160) || `RSVP for ${event.name}`,
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await loadPublicEvent(decodeURIComponent(slug));
  if (!event) notFound();

  const remaining = spotsRemaining(
    event.registration_capacity,
    event.spots_reserved
  );
  const soldOut = remaining !== null && remaining <= 0;
  const open = isRegistrationOpen(event.date) && !soldOut;

  const timeLabel = [event.event_time_start, event.event_time_end]
    .filter((t) => t && t.trim() !== "")
    .join(" – ");

  return (
    <main className="min-h-screen bg-harley-black px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 text-center">
          {event.organization_name ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-harley-orange">
              {event.organization_name}
            </p>
          ) : null}
          <h1 className="mt-2 font-display-heading text-2xl font-bold tracking-tight text-harley-text sm:text-3xl">
            {event.name}
          </h1>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-overlay/95 p-5 shadow-[var(--shadow-card)] sm:p-7">
          <div className="space-y-2.5 text-sm">
            <p className="flex items-center gap-2.5 text-harley-text">
              <CalendarDays className="h-4 w-4 shrink-0 text-harley-orange" />
              {format(parseISO(event.date), "EEEE, MMMM d, yyyy")}
            </p>
            {timeLabel ? (
              <p className="flex items-center gap-2.5 text-harley-text">
                <Clock className="h-4 w-4 shrink-0 text-harley-orange" />
                {timeLabel}
              </p>
            ) : null}
            {event.location ? (
              <p className="flex items-center gap-2.5 text-harley-text">
                <MapPin className="h-4 w-4 shrink-0 text-harley-orange" />
                {event.location}
              </p>
            ) : null}
            {remaining !== null ? (
              <p className="flex items-center gap-2.5 text-harley-text-muted">
                <Users className="h-4 w-4 shrink-0 text-harley-orange" />
                {soldOut
                  ? "Fully booked"
                  : `${remaining} spot${remaining === 1 ? "" : "s"} left`}
              </p>
            ) : null}
          </div>

          {event.description ? (
            <p className="mt-5 whitespace-pre-line border-t border-border-subtle pt-5 text-sm leading-relaxed text-harley-text-muted">
              {event.description}
            </p>
          ) : null}

          <div className="mt-6 border-t border-border-subtle pt-6">
            {open ? (
              <PublicRegisterForm
                slug={event.slug}
                maxPartySize={
                  remaining !== null ? Math.min(remaining, 8) : 8
                }
              />
            ) : (
              <p className="rounded-lg border border-border-subtle bg-surface-base/60 px-4 py-3 text-center text-sm text-harley-text-muted">
                {soldOut
                  ? "This event is fully booked."
                  : "Registration for this event has closed."}
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-harley-text-muted/70">
          Questions? Contact the dealership directly.
        </p>
      </div>
    </main>
  );
}
