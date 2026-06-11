"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  RotateCcw,
  Users,
  X,
} from "lucide-react";

import {
  apiListRegistrations,
  apiPatchEvent,
  apiPatchRegistration,
} from "@/lib/events-api-client";
import {
  buildPublicEventPath,
  spotsRemaining,
  totalCheckedIn,
  totalReservedSpots,
} from "@/lib/registration";
import type {
  Event,
  EventRegistration,
  RegistrationStatus,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { errorMessage, showError, showSuccess } from "@/lib/toast";

const STATUS_BADGE: Record<
  RegistrationStatus,
  { label: string; variant: "success" | "default" | "muted" }
> = {
  registered: { label: "Registered", variant: "default" },
  checked_in: { label: "Checked in", variant: "success" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-base/55 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-harley-text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-harley-text">
        {value}
      </p>
    </div>
  );
}

export function RegistrationSection({
  event,
  canManage,
  onEventUpdate,
}: {
  event: Event;
  canManage: boolean;
  onEventUpdate: (event: Event) => void;
}) {
  const enabled = event.registration_enabled === true;
  const { confirm, confirmDialog } = useConfirm();

  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [capacityInput, setCapacityInput] = useState(
    event.registration_capacity != null
      ? String(event.registration_capacity)
      : ""
  );
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    apiListRegistrations(event.id)
      .then((rows) => {
        if (!cancelled) setRegistrations(rows);
      })
      .catch(() => {
        if (!cancelled) showError("Failed to load registrations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, event.id]);

  const reserved = useMemo(
    () => totalReservedSpots(registrations),
    [registrations]
  );
  const checkedIn = useMemo(
    () => totalCheckedIn(registrations),
    [registrations]
  );
  const remaining = spotsRemaining(event.registration_capacity, reserved);
  const activeCount = registrations.filter(
    (r) => r.status !== "cancelled"
  ).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.confirmation_code.toLowerCase().includes(q)
    );
  }, [registrations, search]);

  const publicUrl =
    typeof window !== "undefined" && event.public_slug
      ? `${window.location.origin}${buildPublicEventPath(event.public_slug)}`
      : event.public_slug
        ? buildPublicEventPath(event.public_slug)
        : "";

  function parsedCapacity(): number | null {
    const n = parseInt(capacityInput, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  async function handleEnable() {
    setSavingSettings(true);
    try {
      const updated = await apiPatchEvent(event.id, {
        registration_enabled: true,
        registration_capacity: parsedCapacity(),
      });
      onEventUpdate(updated);
      showSuccess("Registration is live — share the public link.");
    } catch (err) {
      showError(errorMessage(err, "Failed to enable registration."));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSaveCapacity() {
    setSavingSettings(true);
    try {
      const updated = await apiPatchEvent(event.id, {
        registration_capacity: parsedCapacity(),
      });
      onEventUpdate(updated);
      showSuccess("Capacity updated.");
    } catch (err) {
      showError(errorMessage(err, "Failed to update capacity."));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDisable() {
    const ok = await confirm({
      title: "Turn off registration?",
      message:
        "The public RSVP page stops accepting signups and the link shows registration as closed. Existing RSVPs are kept.",
      confirmLabel: "Turn off",
    });
    if (!ok) return;
    setSavingSettings(true);
    try {
      const updated = await apiPatchEvent(event.id, {
        registration_enabled: false,
      });
      onEventUpdate(updated);
    } catch (err) {
      showError(errorMessage(err, "Failed to disable registration."));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showSuccess("Link copied.");
    } catch {
      showError("Could not copy — long-press or right-click the link instead.");
    }
  }

  async function changeStatus(
    reg: EventRegistration,
    status: RegistrationStatus
  ) {
    if (status === "cancelled") {
      const ok = await confirm({
        title: "Cancel this RSVP?",
        message: `${reg.name}'s registration will be cancelled and their spot${reg.party_size > 1 ? "s" : ""} freed up.`,
        confirmLabel: "Cancel RSVP",
      });
      if (!ok) return;
    }
    setBusyId(reg.id);
    try {
      const updated = await apiPatchRegistration(event.id, reg.id, status);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? updated : r))
      );
    } catch (err) {
      showError(errorMessage(err, "Failed to update registration."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleUseAsAttendance() {
    try {
      const updated = await apiPatchEvent(event.id, { attendance: checkedIn });
      onEventUpdate(updated);
      showSuccess(`Attendance set to ${checkedIn}.`);
    } catch (err) {
      showError(errorMessage(err, "Failed to update attendance."));
    }
  }

  if (!enabled) {
    if (!canManage) return null;
    return (
      <Card className="!p-4 sm:!p-5">
        {confirmDialog}
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-harley-orange" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-harley-text">
              Hosted registration
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-harley-text-muted">
              Publish a public RSVP page customers can open from social posts
              or QR codes. You get a live attendee list and one-tap check-in on
              event day — no more guessing attendance.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-44">
                <Input
                  label="Capacity (optional)"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={capacityInput}
                  onChange={(e) => setCapacityInput(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleEnable}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Turn on registration
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {confirmDialog}

      {canManage ? (
        <Card className="!p-4 sm:!p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-harley-text-muted">
            Public RSVP link
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border-subtle bg-surface-base/60 px-3 py-2 text-xs text-harley-orange">
              {publicUrl}
            </code>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
              >
                <ClipboardCopy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  window.open(publicUrl, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 border-t border-border-subtle pt-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-2">
              <div className="w-36">
                <Input
                  label="Capacity"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={capacityInput}
                  onChange={(e) => setCapacityInput(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSaveCapacity}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Save
              </Button>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDisable}
              disabled={savingSettings}
            >
              Turn off registration
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip label="RSVPs" value={String(activeCount)} />
        <StatChip label="Spots reserved" value={String(reserved)} />
        <StatChip label="Checked in" value={String(checkedIn)} />
        <StatChip
          label="Remaining"
          value={remaining === null ? "∞" : String(remaining)}
        />
      </div>

      {canManage && checkedIn > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleUseAsAttendance}
          >
            <CheckCircle2 className="h-4 w-4" />
            Set attendance to {checkedIn}
          </Button>
        </div>
      ) : null}

      <Input
        type="search"
        placeholder="Search name, email, or confirmation code…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-harley-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading attendees…
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface-base/45 px-4 py-6 text-center text-sm text-harley-text-muted">
          {registrations.length === 0
            ? "No RSVPs yet — share the public link to start filling spots."
            : "No attendees match that search."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((reg) => {
            const badge = STATUS_BADGE[reg.status];
            const busy = busyId === reg.id;
            return (
              <li
                key={reg.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border-subtle bg-harley-dark/50 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-harley-text">
                    {reg.name}
                    {reg.party_size > 1 ? (
                      <span className="text-xs text-harley-text-muted">
                        +{reg.party_size - 1}
                      </span>
                    ) : null}
                    <code className="rounded bg-surface-base/70 px-1.5 py-0.5 text-[11px] tracking-wider text-harley-orange">
                      {reg.confirmation_code}
                    </code>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-harley-text-muted">
                    {reg.email}
                    {reg.phone ? ` · ${reg.phone}` : ""}
                  </p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
                <div className="flex shrink-0 items-center gap-1.5">
                  {reg.status === "registered" ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void changeStatus(reg, "checked_in")}
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Check in
                    </Button>
                  ) : null}
                  {reg.status === "checked_in" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void changeStatus(reg, "registered")}
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Undo
                    </Button>
                  ) : null}
                  {canManage && reg.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => void changeStatus(reg, "cancelled")}
                      disabled={busy}
                      className="rounded-md p-1.5 text-harley-text-muted transition-colors hover:bg-harley-danger/10 hover:text-harley-danger disabled:opacity-50"
                      aria-label={`Cancel RSVP for ${reg.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
