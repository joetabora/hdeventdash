"use client";

import { useState, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getVendors, createVendor } from "@/lib/vendors";
import { Vendor } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { useAppRole } from "@/contexts/app-role-context";
import { Loader2, PlusCircle, Store, Search, ChevronRight } from "lucide-react";
import { vendorKeys, eventKeys } from "@/lib/query-keys";

export function VendorsPageClient({ initialVendors }: { initialVendors: Vendor[] }) {
  const queryClient = useQueryClient();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );
  const { canManageEvents } = useAppRole();

  const vendorsQuery = useQuery({
    queryKey: vendorKeys.list(),
    queryFn: () => getVendors(createClient()),
    initialData: initialVendors,
  });

  const vendors = vendorsQuery.data ?? [];

  useLayoutEffect(() => {
    queryClient.setQueryData(vendorKeys.list(), initialVendors);
  }, [initialVendors, queryClient]);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = vendors.filter((v) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.name.toLowerCase().includes(q) ||
      v.contact_name.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q)
    );
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const supabase = supabaseRef.current;
    if (!supabase || !name.trim()) return;
    setSaving(true);
    try {
      await createVendor(supabase, {
        name: name.trim(),
        contact_name: contactName,
        email,
        phone,
        website,
        category,
        notes,
      });
      setModalOpen(false);
      setName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setWebsite("");
      setCategory("");
      setNotes("");
      void queryClient.invalidateQueries({ queryKey: vendorKeys.list() });
      void queryClient.invalidateQueries({ queryKey: eventKeys.orgVendors() });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!canManageEvents) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-harley-text mb-2">Vendors</h1>
        <p className="text-sm text-harley-text-muted">
          You don&apos;t have access to vendor management.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Store className="w-8 h-8 text-harley-orange shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-harley-text">Vendors</h1>
            <p className="text-sm text-harley-text-muted">
              Directory for your organization — attach vendors to events from each event page.
            </p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)} className="shrink-0">
          <PlusCircle className="w-4 h-4" />
          Add vendor
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-harley-text-muted" />
        <input
          type="search"
          placeholder="Search name, contact, category, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="!p-8 text-center text-harley-text-muted text-sm">
          {vendors.length === 0
            ? "No vendors yet. Add your first vendor to start attaching them to events."
            : "No vendors match your search."}
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((v) => (
            <li key={v.id}>
              <Link href={`/vendors/${v.id}`}>
                <Card className="!p-4 transition-colors hover:border-harley-orange/40 hover:bg-harley-gray/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-harley-text truncate">{v.name}</p>
                      <p className="text-xs text-harley-text-muted truncate">
                        {[v.category, v.contact_name, v.email].filter(Boolean).join(" · ") ||
                          "No contact details"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-harley-text-muted shrink-0" />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New vendor" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Company or vendor name"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Catering, AV, sponsor"
            />
            <Input
              label="Contact name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Input
            label="Website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
          />
          <Textarea
            label="Internal notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save vendor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
