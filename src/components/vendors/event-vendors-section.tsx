"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Vendor,
  EventVendorWithVendor,
  VENDOR_PARTICIPATION_STATUSES,
  VendorParticipationStatus,
} from "@/types/database";
import {
  vendorParticipationBadgeVariant,
  vendorParticipationLabel,
} from "@/lib/vendor-participation";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { formatUsd } from "@/lib/format-currency";
import { Loader2, UserMinus, ExternalLink, DollarSign } from "lucide-react";
import { showError } from "@/lib/toast";

interface EventVendorsSectionProps {
  eventId: string;
  eventVendors: EventVendorWithVendor[];
  onUpdate: () => void;
  canMutate: boolean;
  onOptimisticPatch?: (linkId: string, updates: Partial<EventVendorWithVendor>) => void;
  onOptimisticRemove?: (linkId: string) => void;
}

export function EventVendorsSection({
  eventId,
  eventVendors,
  onUpdate,
  canMutate,
  onOptimisticPatch,
  onOptimisticRemove,
}: EventVendorsSectionProps) {
  const [vendorId, setVendorId] = useState("");
  const [attachRole, setAttachRole] = useState("");
  const [attachNotes, setAttachNotes] = useState("");
  const [attaching, setAttaching] = useState(false);
  

  const [vendorSearch, setVendorSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Vendor[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(vendorSearch.trim()), 350);
    return () => clearTimeout(t);
  }, [vendorSearch]);

  useEffect(() => {
    if (!canMutate) return;
    let cancelled = false;
    void (async () => {
      setSearchLoading(true);
      try {
        const res = await apiFetchJson<{ vendors: Vendor[] }>(
          `/api/vendors/search?q=${encodeURIComponent(debouncedSearch)}&limit=40`
        );
        if (!cancelled) setSearchResults(res.vendors);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canMutate, debouncedSearch]);

  const availableVendors = useMemo(() => {
    const active = new Set(eventVendors.map((r) => r.vendor_id));
    return searchResults.filter((v) => !active.has(v.id));
  }, [searchResults, eventVendors]);

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
    setAttaching(true);
    try {
      await apiFetchJson(`/api/events/${eventId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: vendorId,
          role: attachRole,
          notes: attachNotes,
        }),
      });
      setVendorId("");
      setAttachRole("");
      setAttachNotes("");
      onUpdate();
    } catch (err) {
      console.error(err);
      showError("Failed to attach vendor.");
    } finally {
      setAttaching(false);
    }
  }

  function patchLink(
    linkId: string,
    patch: Partial<{ role: string; notes: string; participation_status: VendorParticipationStatus; agreed_fee: number | null; fee_notes: string }>
  ) {
    const prev = eventVendors.find((v) => v.id === linkId);
    onOptimisticPatch?.(linkId, patch as Partial<EventVendorWithVendor>);
    apiFetchJson(`/api/events/${eventId}/vendors/${linkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch((err) => {
      console.error(err);
      showError("Failed to update vendor.");
      if (prev) {
        const revert: Partial<EventVendorWithVendor> = {};
        for (const k of Object.keys(patch)) {
          (revert as unknown as Record<string, unknown>)[k] = (prev as unknown as Record<string, unknown>)[k];
        }
        onOptimisticPatch?.(linkId, revert);
      }
      onUpdate();
    });
  }

  function handleDetach(linkId: string) {
    if (!confirm("Remove this vendor from the event? Their participation stays in history on their profile.")) {
      return;
    }
    onOptimisticRemove?.(linkId);
    apiFetchJson(`/api/events/${eventId}/vendors/${linkId}`, {
      method: "DELETE",
    }).catch((err) => {
      console.error(err);
      showError("Failed to remove vendor.");
      onUpdate();
    });
  }

  return (
    <div className="space-y-4">
      {canMutate && (
        <Card className="!p-4">
          <p className="text-xs text-harley-text-muted mb-3">
            Search your{" "}
            <Link href="/vendors" className="text-harley-orange hover:underline inline-flex items-center gap-0.5">
              directory
              <ExternalLink className="w-3 h-3" />
            </Link>{" "}
            to attach a vendor. Re-attaching after removal restores the same link and history.
          </p>
          <form onSubmit={handleAttach} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-harley-text-muted mb-1.5">
                Search vendors
              </label>
              <div className="relative">
                <input
                  type="search"
                  className="w-full px-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20"
                  placeholder="Name, contact, category, email…"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                />
                {searchLoading ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-harley-text-muted" />
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Vendor"
                options={vendorSelectOptions}
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                required
                disabled={availableVendors.length === 0 || searchLoading}
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
              disabled={
                attaching || !vendorId || availableVendors.length === 0 || searchLoading
              }
              className="w-full sm:w-auto"
            >
              {attaching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Attach vendor
            </Button>
            {availableVendors.length === 0 && !searchLoading && searchResults.length > 0 && (
              <p className="text-xs text-harley-text-muted">
                Every vendor in this search result is already attached. Try a different search or add vendors in the directory.
              </p>
            )}
            {availableVendors.length === 0 && !searchLoading && searchResults.length === 0 && debouncedSearch && (
              <p className="text-xs text-harley-text-muted">No vendors match that search.</p>
            )}
            {availableVendors.length === 0 && !searchLoading && searchResults.length === 0 && !debouncedSearch && (
              <p className="text-xs text-harley-warning">
                No vendors in the first page of your directory — try searching or add vendors on the Vendors page.
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
                        <Badge
                          variant={vendorParticipationBadgeVariant(
                            row.participation_status
                          )}
                        >
                          {vendorParticipationLabel(row.participation_status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-harley-text-muted mt-1">
                        {[v.category, v.contact_name].filter(Boolean).join(" · ")}
                        {row.agreed_fee != null && row.agreed_fee > 0 && (
                          <>
                            {(v.category || v.contact_name) ? " · " : ""}
                            <span className="text-harley-orange font-medium">{formatUsd(row.agreed_fee)}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {canMutate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-harley-text-muted hover:text-harley-danger"
                        onClick={() => handleDetach(row.id)}
                      >
                        <UserMinus className="w-4 h-4" />
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
                            className="w-full px-3 py-2 rounded-lg bg-harley-black/30 border border-harley-gray-lighter/40 text-sm text-harley-text focus:outline-none focus:border-harley-orange/60"
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
                          onChange={(e) =>
                            patchLink(row.id, {
                              participation_status: e.target
                                .value as VendorParticipationStatus,
                            })
                          }
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
                            <DollarSign className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                            Agreed Fee
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="w-full px-3 py-2 rounded-lg bg-harley-black/30 border border-harley-gray-lighter/40 text-sm text-harley-text focus:outline-none focus:border-harley-orange/60"
                            defaultValue={row.agreed_fee != null ? String(row.agreed_fee) : ""}
                            key={`${row.id}-fee-${row.updated_at}`}
                            placeholder="0.00"
                            onBlur={(e) => {
                              const raw = e.target.value.trim();
                              const next = raw === "" ? null : Number(raw);
                              const prev = row.agreed_fee ?? null;
                              if (next !== prev) {
                                patchLink(row.id, { agreed_fee: Number.isFinite(next) ? next : null });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
                            Fee Notes
                          </label>
                          <input
                            className="w-full px-3 py-2 rounded-lg bg-harley-black/30 border border-harley-gray-lighter/40 text-sm text-harley-text focus:outline-none focus:border-harley-orange/60"
                            defaultValue={row.fee_notes}
                            key={`${row.id}-fee-notes-${row.updated_at}`}
                            placeholder="e.g. with sound: $800 / without: $500"
                            onBlur={(e) => {
                              if (e.target.value !== row.fee_notes) {
                                patchLink(row.id, { fee_notes: e.target.value });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
                          Notes
                        </label>
                        <textarea
                          className="w-full min-h-[72px] px-3 py-2 rounded-lg bg-harley-black/30 border border-harley-gray-lighter/40 text-sm text-harley-text focus:outline-none focus:border-harley-orange/60 resize-y"
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
                      {row.agreed_fee != null && row.agreed_fee > 0 && (
                        <p className="flex items-center gap-1 text-harley-orange">
                          <DollarSign className="w-3.5 h-3.5" />
                          {formatUsd(row.agreed_fee)}
                          {row.fee_notes ? <span className="text-harley-text-muted ml-1">— {row.fee_notes}</span> : null}
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
