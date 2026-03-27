import { createClient } from "@/lib/supabase/server";
import { listVendorsPaginated } from "@/lib/vendors";
import { VendorsPageClient } from "./vendors-page-client";

const DEFAULT_PAGE_SIZE = 25;

export default async function VendorsPage() {
  const supabase = await createClient();
  const initial = await listVendorsPaginated(supabase, {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    search: "",
  });
  const vendorsClientKey = [
    initial.total,
    initial.page,
    initial.pageSize,
    ...initial.vendors.map((v) => `${v.id}:${v.updated_at}`),
  ].join("\u0001");

  return (
    <VendorsPageClient
      key={vendorsClientKey}
      initialVendors={initial.vendors}
      initialTotal={initial.total}
      initialPage={initial.page}
      pageSize={initial.pageSize}
    />
  );
}
