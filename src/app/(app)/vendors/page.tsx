import { createClient } from "@/lib/supabase/server";
import { getVendors } from "@/lib/vendors";
import { VendorsPageClient } from "./vendors-page-client";

export default async function VendorsPage() {
  const supabase = await createClient();
  const initialVendors = await getVendors(supabase);
  const vendorsClientKey = initialVendors
    .map((v) => `${v.id}:${v.updated_at}`)
    .join("\u0001");
  return (
    <VendorsPageClient key={vendorsClientKey} initialVendors={initialVendors} />
  );
}
