import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getVendor,
  getVendorParticipationHistory,
} from "@/lib/vendors";
import type { Vendor, EventVendorWithEvent } from "@/types/database";
import { VendorDetailClient } from "./vendor-detail-client";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let initialVendor: Vendor;
  let initialHistory: EventVendorWithEvent[];
  try {
    [initialVendor, initialHistory] = await Promise.all([
      getVendor(supabase, id),
      getVendorParticipationHistory(supabase, id),
    ]);
  } catch {
    notFound();
  }

  return (
    <VendorDetailClient
      vendorId={id}
      initialVendor={initialVendor}
      initialHistory={initialHistory}
    />
  );
}
