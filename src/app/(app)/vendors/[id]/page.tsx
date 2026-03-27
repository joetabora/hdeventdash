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

  const historyFingerprint = JSON.stringify(
    [...initialHistory]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((h) => [
        h.id,
        h.updated_at,
        h.detached_at,
        h.participation_status,
        h.event?.id,
        h.event?.date,
      ])
  );

  return (
    <VendorDetailClient
      key={`${id}:${initialVendor.updated_at}:${historyFingerprint}`}
      initialVendor={initialVendor}
      initialHistory={initialHistory}
    />
  );
}
