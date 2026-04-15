import { SupabaseClient } from "@supabase/supabase-js";
import {
  Vendor,
  EventVendor,
  EventVendorWithVendor,
  EventVendorWithEvent,
  VendorParticipationStatus,
} from "@/types/database";

export async function getVendors(supabase: SupabaseClient): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Vendor[];
}

export type VendorsListPage = {
  vendors: Vendor[];
  total: number;
  page: number;
  pageSize: number;
};

function escapeIlikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function quotePostgrestIlikeValue(p: string): string {
  return `"${p.replace(/"/g, '""')}"`;
}

/**
 * Paginated directory list with optional multi-column search (server-side).
 */
export async function listVendorsPaginated(
  supabase: SupabaseClient,
  opts: { page: number; pageSize: number; search: string }
): Promise<VendorsListPage> {
  const { page, pageSize, search } = opts;
  const safePage = Math.max(1, page);
  const safeSize = Math.min(50, Math.max(1, pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let q = supabase
    .from("vendors")
    .select("*", { count: "exact" })
    .order("name", { ascending: true });

  const term = search.trim();
  if (term.length > 0) {
    const p = `%${escapeIlikePattern(term)}%`;
    const qv = quotePostgrestIlikeValue(p);
    q = q.or(
      `name.ilike.${qv},contact_name.ilike.${qv},category.ilike.${qv},email.ilike.${qv}`
    );
  }

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return {
    vendors: (data ?? []) as Vendor[],
    total: count ?? 0,
    page: safePage,
    pageSize: safeSize,
  };
}

export async function getVendor(
  supabase: SupabaseClient,
  id: string
): Promise<Vendor> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Vendor;
}

export async function createVendor(
  supabase: SupabaseClient,
  row: {
    organization_id?: string;
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    website?: string;
    category?: string;
    notes?: string;
  }
) {
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      name: row.name,
      contact_name: row.contact_name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      website: row.website ?? "",
      category: row.category ?? "",
      notes: row.notes ?? "",
      ...(row.organization_id
        ? { organization_id: row.organization_id }
        : {}),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Vendor;
}

export async function updateVendor(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<
    Pick<
      Vendor,
      | "name"
      | "contact_name"
      | "email"
      | "phone"
      | "website"
      | "category"
      | "notes"
    >
  >
) {
  const { data, error } = await supabase
    .from("vendors")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Vendor;
}

export async function deleteVendor(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) throw error;
}

/** Vendors currently attached to an event (planning view). */
export async function getActiveEventVendors(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventVendorWithVendor[]> {
  const { data, error } = await supabase
    .from("event_vendors")
    .select("*, vendor:vendors(*)")
    .eq("event_id", eventId)
    .is("detached_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventVendorWithVendor[];
}

export async function attachVendorToEvent(
  supabase: SupabaseClient,
  payload: {
    event_id: string;
    vendor_id: string;
    role?: string;
    participation_status?: VendorParticipationStatus;
    notes?: string;
    agreed_fee?: number | null;
    fee_notes?: string;
  }
): Promise<EventVendor> {
  const { data, error } = await supabase
    .from("event_vendors")
    .upsert(
      {
        event_id: payload.event_id,
        vendor_id: payload.vendor_id,
        role: payload.role ?? "",
        participation_status: payload.participation_status ?? "invited",
        notes: payload.notes ?? "",
        agreed_fee: payload.agreed_fee ?? null,
        fee_notes: payload.fee_notes ?? "",
        detached_at: null,
      },
      { onConflict: "event_id,vendor_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as EventVendor;
}

export async function updateEventVendor(
  supabase: SupabaseClient,
  linkId: string,
  updates: Partial<
    Pick<EventVendor, "role" | "participation_status" | "notes" | "agreed_fee" | "fee_notes">
  >
) {
  const { data, error } = await supabase
    .from("event_vendors")
    .update(updates)
    .eq("id", linkId)
    .select()
    .single();
  if (error) throw error;
  return data as EventVendor;
}

/** Remove vendor from event planning list; row remains for participation history. */
export async function detachVendorFromEvent(
  supabase: SupabaseClient,
  linkId: string
) {
  const { error } = await supabase
    .from("event_vendors")
    .update({ detached_at: new Date().toISOString() })
    .eq("id", linkId);
  if (error) throw error;
}

/** All event links for a vendor (active + past), for history UI. */
export async function getVendorParticipationHistory(
  supabase: SupabaseClient,
  vendorId: string
): Promise<EventVendorWithEvent[]> {
  const { data, error } = await supabase
    .from("event_vendors")
    .select("*, event:events(id, name, date, status, location)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as EventVendorWithEvent[];
  return rows.sort((a, b) => {
    const da = a.event?.date ?? "";
    const db = b.event?.date ?? "";
    return db.localeCompare(da);
  });
}
