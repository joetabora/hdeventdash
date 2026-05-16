"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { PlusCircle, Store, Search, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

type VendorsApiPage = {
  vendors: Vendor[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function VendorsPageClient({
  initialVendors,
  initialTotal,
  initialPage,
  pageSize,
}: {
  initialVendors: Vendor[];
  initialTotal: number;
  initialPage: number;
  pageSize: number;
}) {
  const router = useRouter();
  const { canManageEvents } = useAppRole();

  const [vendors, setVendors] = useState(initialVendors);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const { pending, error, setError, clearError, run } = useFormSubmitState();
  const [formValues, setFormValues] = useState<VendorFormValues>(
    EMPTY_VENDOR_FORM_VALUES
  );

  const skipInitialFetch = useRef(true);

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

  const loadPage = useCallback(
    async (p: number, q: string) => {
      setListLoading(true);
      setListError("");
      try {
        const res = await apiFetchJson<VendorsApiPage>(
          `/api/vendors?page=${p}&pageSize=${pageSize}&q=${encodeURIComponent(q)}`
        );
        setVendors(res.vendors);
        setTotal(res.total);
        setPage(res.page);
      } catch {
        setListError("Failed to load vendors.");
        setVendors([]);
        setTotal(0);
      } finally {
        setListLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (skipInitialFetch.current && debouncedSearch === "") {
      skipInitialFetch.current = false;
      return;
    }
    setPage(1);
    void loadPage(1, debouncedSearch);
  }, [debouncedSearch, loadPage]);

  const goToPage = useCallback(
    (p: number) => {
      setPage(p);
      void loadPage(p, debouncedSearch);
    },
    [debouncedSearch, loadPage]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

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
    closeModal();
    router.refresh();
    await loadPage(page, debouncedSearch);
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
              Shared directory for all dealerships — attach vendors to events from each event page.
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

      {listError ? (
        <Card className="!p-4 text-sm text-harley-danger">{listError}</Card>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 text-sm text-harley-text-muted">
        <span>
          {listLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </span>
          ) : total === 0 ? (
            "No vendors match your filters."
          ) : (
            <>
              Showing {rangeStart}–{rangeEnd} of {total}
            </>
          )}
        </span>
        {total > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={listLoading || page <= 1}
              onClick={() => goToPage(Math.max(1, page - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-xs tabular-nums px-1">
              Page {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={listLoading || page >= totalPages}
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {vendors.length === 0 && !listLoading ? (
        <Card className="!p-8 text-center text-harley-text-muted text-sm">
          {total === 0 && debouncedSearch === ""
            ? "No vendors yet. Add your first vendor to start attaching them to events."
            : "No vendors match your search."}
        </Card>
      ) : (
        <ul className="space-y-2">
          {vendors.map((v) => (
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
