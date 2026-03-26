"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  attachVendorToEvent,
  updateEventVendor,
  detachVendorFromEvent,
} from "@/lib/vendors";
import {
  Vendor,
  EventVendorWithVendor,
  VENDOR_PARTICIPATION_STATUSES,
  VendorParticipationStatus,
} from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Loader2, UserMinus, ExternalLink } from "lucide-react";

function participationVariant(
  s: VendorParticipationStatus
): "default" | "success" | "warning" | "danger" | "muted" | "orange" {
  switch (s) {
    case "participated":
      return "success";
    case "confirmed":
      return "muted";
    case "invited":
      return "warning";
    case "declined":
    case "cancelled":
      return "danger";
    default:
      return "default";
  }
}

interface EventVendorsSectionProps {
  eventId: string;
  eventVendors: EventVendorWithVendor[];
  allVendors: Vendor[];
  onUpdate: () => void;
  canMutate: boolean;
}

export function EventVendorsSection({
  eventId,
  eventVendors,
  allVendors,
  onUpdate,
  canMutate,
}: EventVendorsSectionProps) {
  const [vendorId, setVendorId] = useState("");
  const [attachRole, setAttachRole] = useState("");
  const [attachNotes, setAttachNotes] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);

  const availableVendors = useMemo(() => {
    const active = new Set(eventVendors.map((r) => r.vendor_id));
    return allVendors.filter((v) => !active.has(v.id));
  }, [allVendors, eventVendors]);

  const vendorSelectOptions = useMemo(
    () => [
      { value: "", label: "Select vendor…" },
      ...availableVendors.map((v) => ({ value: v.id, label: v.name })),
    ],
    [availableVendors]
  );

  async function handleAttach(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) return;
    const supabase = createClient();
    setAttaching(true);
    try {
      await attachVendorToEvent(supabase, {
        event_id: eventId,
        vendor_id: vendorId,
        role: attachRole,
        notes: attachNotes,
      });
      setVendorId("");
      setAttachRole("");
      setAttachNotes("");
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setAttaching(false);
    }
  }

  async function patchLink(
    linkId: string,
    patch: Partial<{ role: string; notes: string; participation_status: VendorParticipationStatus }>
  ) {
    const supabase = createClient();
    setBusyLinkId(linkId);
    try {
      await updateEventVendor(supabase, linkId, patch);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyLinkId(null);
    }
  }

  async function handleDetach(linkId: string) {
    if (!confirm("Remove this vendor from the event? Their participation stays in history on their profile.")) {
      return;
    }
    const supabase = createClient();
    setBusyLinkId(linkId);
    try {
      await detachVendorFromEvent(supabase, linkId);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyLinkId(null);
    }
  }

  return (
    <div className="space-y-4">
      {canMutate && (
        <Card className="!p-4">
          <p className="text-xs text-harley-text-muted mb-3">
            Add a vendor from your{" "}
            <Link href="/vendors" className="text-harley-orange hover:underline inline-flex items-center gap-0.5">
              directory
              <ExternalLink className="w-3 h-3" />
            </Link>
            . Re-attaching after removal restores the same link and history.
          </p>
          <form onSubmit={handleAttach} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Vendor"
                options={vendorSelectOptions}
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                required
                disabled={availableVendors.length === 0}
              />
              <div>
                <label className="block text-sm text-harley-text-muted mb-1.5">
                  Role at event
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20"
                  placeholder="e.g. Catering, sponsor, booth"
                  value={attachRole}
                  onChange={(e) => setAttachRole(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-harley-text-muted mb-1.5">
                Notes
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20"
                placeholder="Optional"
                value={attachNotes}
                onChange={(e) => setAttachNotes(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={attaching || !vendorId || availableVendors.length === 0}
              className="w-full sm:w-auto"
            >
              {attaching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Attach vendor
            </Button>
            {availableVendors.length === 0 && allVendors.length > 0 && (
              <p className="text-xs text-harley-text-muted">
                Every directory vendor is already attached to this event.
              </p>
            )}
            {allVendors.length === 0 && (
              <p className="text-xs text-harley-warning">
                No vendors yet — create some in the Vendors page first.
              </p>
            )}
          </form>
        </Card>
      )}

      {eventVendors.length === 0 ? (
        <p className="text-sm text-harley-text-muted py-2">
          No vendors attached to this event.
        </p>
      ) : (
        <ul className="space-y-3">
          {eventVendors.map((row) => {
            const busy = busyLinkId === row.id;
            const v = row.vendor;
            return (
              <li key={row.id}>
                <Card className="!p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/vendors/${v.id}`}
                          className="font-medium text-harley-text hover:text-harley-orange transition-colors truncate"
                        >
                          {v.name}
                        </Link>
                        <Badge variant={participationVariant(row.participation_status)}>
                          {VENDOR_PARTICIPATION_STATUSES.find(
                            (x) => x.value === row.participation_status
                          )?.label ?? row.participation_status}
                        </Badge>
                      </div>
                      {(v.category || v.contact_name) && (
                        <p className="text-xs text-harley-text-muted mt-1">
                          {[v.category, v.contact_name].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    {canMutate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-harley-text-muted hover:text-harley-danger"
                        onClick={() => handleDetach(row.id)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                        Remove
                      </Button>
                    )}
                  </div>

                  {canMutate ? (
                    <>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
                            Role
                          </label>
                          <input
                            disabled={busy}
                            className="w-full px-3 py-2 rounded-lg bg-harley-black/30 border border-harley-gray-lighter/40 text-sm text-harley-text focus:outline-none focus:border-harley-orange/60 disabled:opacity-50"
                            defaultValue={row.role}
                            key={`${row.id}-role-${row.updated_at}`}
                            onBlur={(e) => {
                              if (e.target.value !== row.role) {
                                patchLink(row.id, { role: e.target.value });
                              }
                            }}
                          />
                        </div>
                        <Select
                          label="Participation"
                          options={VENDOR_PARTICIPATION_STATUSES.map((o) => ({
                            value: o.value,
                            label: o.label,
                          }))}
                          value={row.participation_status}
                          disabled={busy}
                          onChange={(e) =>
                            patchLink(row.id, {
                              participation_status: e.target
                                .value as VendorParticipationStatus,
                            })
                          }
                        />
                      </div>
                      <div className="mt-2">
                        <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
                          Notes
                        </label>
                        <textarea
                          disabled={busy}
                          className="w-full min-h-[72px] px-3 py-2 rounded-lg bg-harley-black/30 border border-harley-gray-lighter/40 text-sm text-harley-text focus:outline-none focus:border-harley-orange/60 resize-y disabled:opacity-50"
                          defaultValue={row.notes}
                          key={`${row.id}-notes-${row.updated_at}`}
                          onBlur={(e) => {
                            if (e.target.value !== row.notes) {
                              patchLink(row.id, { notes: e.target.value });
                            }
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 text-sm text-harley-text-muted space-y-1">
                      {row.role && (
                        <p>
                          <span className="text-harley-text-muted/80">Role:</span> {row.role}
                        </p>
                      )}
                      {row.notes && <p className="whitespace-pre-wrap">{row.notes}</p>}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
