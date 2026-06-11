"use client";

import { useState } from "react";
import { CalendarPlus, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type RegisterResult = {
  ok: boolean;
  confirmation_code?: string;
  error?: string;
  remaining?: number;
};

function errorCopy(result: RegisterResult): string {
  switch (result.error) {
    case "already_registered":
      return "This email is already registered for the event. See you there!";
    case "capacity":
      return result.remaining && result.remaining > 0
        ? `Only ${result.remaining} spot${result.remaining === 1 ? "" : "s"} left — try a smaller group size.`
        : "Sorry, this event just filled up.";
    case "not_found":
      return "Registration for this event is no longer available.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function PublicRegisterForm({
  slug,
  maxPartySize,
}: {
  slug: string;
  maxPartySize: number;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  const partySizeOptions = Array.from(
    { length: Math.max(maxPartySize, 1) },
    (_, i) => {
      const n = i + 1;
      return {
        value: String(n),
        label: n === 1 ? "Just me" : `${n} people`,
      };
    }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/public/events/${encodeURIComponent(slug)}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            party_size: parseInt(partySize, 10) || 1,
            website,
          }),
        }
      );
      const data = (await res.json()) as RegisterResult;
      if (res.ok && data.ok && data.confirmation_code) {
        setConfirmationCode(data.confirmation_code);
      } else {
        setError(errorCopy(data));
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmationCode) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-harley-success" />
        <h2 className="mt-3 font-display-heading text-lg font-semibold text-harley-text">
          You&apos;re on the list!
        </h2>
        <p className="mt-1 text-sm text-harley-text-muted">
          Show this confirmation code at check-in:
        </p>
        <p className="mx-auto mt-3 w-fit rounded-lg border border-harley-orange/35 bg-harley-orange/10 px-5 py-2.5 font-mono text-xl font-bold tracking-[0.2em] text-harley-orange">
          {confirmationCode}
        </p>
        <p className="mt-3 text-xs text-harley-text-muted">
          Save it now — take a screenshot or add the event to your calendar.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => {
            window.location.href = `/api/public/events/${encodeURIComponent(slug)}/ics`;
          }}
        >
          <CalendarPlus className="h-4 w-4" />
          Add to calendar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="font-display-heading text-base font-semibold text-harley-text">
        Reserve your spot
      </h2>
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        maxLength={200}
        required
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        maxLength={320}
        required
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Phone (optional)"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          maxLength={50}
        />
        <Select
          label="Group size"
          options={partySizeOptions}
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
        />
      </div>
      {/* Honeypot: hidden from humans, bots auto-fill it. */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p className="rounded-lg border border-harley-danger/30 bg-harley-danger/10 px-3 py-2 text-sm text-harley-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        RSVP
      </Button>
    </form>
  );
}
