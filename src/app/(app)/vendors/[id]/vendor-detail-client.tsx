"use client";

import { useState, useCallback, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getVendor,
  updateVendor,
  deleteVendor,
  getVendorParticipationHistory,
} from "@/lib/vendors";
import {
  Vendor,
  EventVendorWithEvent,
  VENDOR_PARTICIPATION_STATUSES,
} from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { useAppRole } from "@/contexts/app-role-context";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { format, parseISO } from "date-fns";

function participationVariant(
  s: string
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

export function VendorDetailClient({
  vendorId,
  initialVendor,
  initialHistory,
}: {
  vendorId: string;
  initialVendor: Vendor;
  initialHistory: EventVendorWithEvent[];
}) {
  const router = useRouter();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );
  const { canManageEvents } = useAppRole();

  const [vendor, setVendor] = useState<Vendor | null>(initialVendor);
  const [history, setHistory] = useState<EventVendorWithEvent[]>(initialHistory);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      const [v, h] = await Promise.all([
        getVendor(supabase, vendorId),
        getVendorParticipationHistory(supabase, vendorId),
      ]);
      setVendor(v);
      setHistory(h);
    } catch (e) {
      console.error(e);
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useLayoutEffect(() => {
    setVendor(initialVendor);
    setHistory(initialHistory);
  }, [vendorId, initialVendor, initialHistory]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = supabaseRef.current;
    if (!supabase || !vendor) return;
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const updated = await updateVendor(supabase, vendor.id, {
        name: String(fd.get("name") ?? "").trim(),
        contact_name: String(fd.get("contact_name") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        website: String(fd.get("website") ?? ""),
        category: String(fd.get("category") ?? ""),
        notes: String(fd.get("notes") ?? ""),
      });
      setVendor(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this vendor permanently? Event participation rows will be removed.")) {
      return;
    }
    const supabase = supabaseRef.current;
    if (!supabase || !vendor) return;
    try {
      await deleteVendor(supabase, vendor.id);
      router.push("/vendors");
    } catch (err) {
      console.error(err);
    }
  }

  if (!canManageEvents) {
    return (
      <p className="text-sm text-harley-text-muted">You don&apos;t have access to this page.</p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-harley-orange" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div>
        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to vendors
        </Link>
        <p className="text-harley-text-muted">Vendor not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/vendors"
        className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to vendors
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-harley-text">{vendor.name}</h1>
        <Button variant="danger" size="sm" onClick={handleDelete} className="shrink-0">
          <Trash2 className="w-4 h-4" />
          Delete vendor
        </Button>
      </div>

      <form
        key={`vendor-form-${vendor.updated_at}`}
        onSubmit={handleSave}
        className="space-y-6"
      >
        <Card className="!p-5 space-y-4">
          <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
            Vendor details
          </h2>
          <Input name="name" label="Name *" defaultValue={vendor.name} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="category" label="Category" defaultValue={vendor.category} />
            <Input name="contact_name" label="Contact name" defaultValue={vendor.contact_name} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="email" label="Email" type="email" defaultValue={vendor.email} />
            <Input name="phone" label="Phone" type="tel" defaultValue={vendor.phone} />
          </div>
          <Input name="website" label="Website" defaultValue={vendor.website} />
          <Textarea name="notes" label="Internal notes" defaultValue={vendor.notes} />
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save changes
          </Button>
        </Card>
      </form>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide mb-3">
          Participation history
        </h2>
        <p className="text-xs text-harley-text-muted mb-4">
          Every event this vendor was linked to, including events they were removed from (still listed for
          history). Active assignments have no &quot;Removed&quot; badge.
        </p>
        {history.length === 0 ? (
          <Card className="!p-6 text-sm text-harley-text-muted">
            No events yet. Attach this vendor from an event&apos;s Vendors section.
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-harley-gray/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-harley-gray/60 bg-harley-gray/40 text-left text-xs text-harley-text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">On event</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => {
                  const ev = row.event;
                  if (!ev) return null;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-harley-gray/40 last:border-0 hover:bg-harley-gray/20"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/events/${ev.id}`}
                          className="text-harley-orange hover:underline font-medium"
                        >
                          {ev.name}
                        </Link>
                        {ev.location ? (
                          <p className="text-xs text-harley-text-muted flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {ev.location}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-harley-text-muted whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {format(parseISO(ev.date), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={participationVariant(row.participation_status)}>
                          {VENDOR_PARTICIPATION_STATUSES.find(
                            (x) => x.value === row.participation_status
                          )?.label ?? row.participation_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-harley-text-muted max-w-[140px] truncate">
                        {row.role || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.detached_at ? (
                          <Badge variant="default">Removed</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
