"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Vendor } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormActions } from "@/components/forms/form-actions";
import { FormErrorAlert } from "@/components/forms/form-error-alert";
import {
  EMPTY_VENDOR_FORM_VALUES,
  VendorFormFields,
  vendorFormValuesToPayload,
  type VendorFormValues,
} from "@/components/forms/vendor-form-fields";
import { useFormSubmitState } from "@/hooks/use-form-submit-state";
import { useAppRole } from "@/contexts/app-role-context";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import { PlusCircle, Store, Search, ChevronRight } from "lucide-react";

export function VendorsPageClient({ initialVendors }: { initialVendors: Vendor[] }) {
  const router = useRouter();
  const { canManageEvents } = useAppRole();

  const [vendors, setVendors] = useState(initialVendors);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const { pending, error, setError, clearError, run } = useFormSubmitState();
  const [formValues, setFormValues] = useState<VendorFormValues>(
    EMPTY_VENDOR_FORM_VALUES
  );

  function patchForm(field: keyof VendorFormValues, value: string) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function resetCreateForm() {
    setFormValues(EMPTY_VENDOR_FORM_VALUES);
    clearError();
  }

  function closeModal() {
    setModalOpen(false);
    resetCreateForm();
  }

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
    clearError();
    if (!formValues.name.trim()) {
      setError("Name is required");
      return;
    }
    const created = await run(async () =>
      apiFetchJson<Vendor>("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorFormValuesToPayload(formValues)),
      })
    );
    if (!created) return;
    setVendors((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
    closeModal();
    router.refresh();
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

      <Modal isOpen={modalOpen} onClose={closeModal} title="New vendor" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <VendorFormFields values={formValues} onChange={patchForm} />
          <FormErrorAlert message={error} />
          <FormActions
            pending={pending}
            submitLabel="Save vendor"
            disableSubmit={!formValues.name.trim()}
            onCancel={closeModal}
            order="cancel-first"
          />
        </form>
      </Modal>
    </div>
  );
}
