import { apiUploadDocument } from "@/lib/events-api-client";
import {
  type PlaybookLineItemBucketKey,
  type PlaybookWorkflow,
} from "@/lib/playbook-workflow";

export type PendingLineItemInvoice = {
  bucket: PlaybookLineItemBucketKey;
  index: number;
  file: File;
};

export function pendingLineItemInvoiceKey(
  bucket: PlaybookLineItemBucketKey,
  index: number
): string {
  return `${bucket}:${index}`;
}

export function parsePendingLineItemInvoiceKey(
  key: string
): { bucket: PlaybookLineItemBucketKey; index: number } | null {
  const sep = key.indexOf(":");
  if (sep < 0) return null;
  const bucket = key.slice(0, sep) as PlaybookLineItemBucketKey;
  const index = Number(key.slice(sep + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { bucket, index };
}

/** Upload deferred invoice files and attach document ids to workflow line items. */
export async function applyPendingLineItemInvoices(
  eventId: string,
  workflow: PlaybookWorkflow,
  pending: PendingLineItemInvoice[],
  organizationId?: string | null
): Promise<PlaybookWorkflow> {
  if (!pending.length) return workflow;

  const next: PlaybookWorkflow = { ...workflow };
  for (const { bucket, index, file } of pending) {
    const doc = await apiUploadDocument(
      eventId,
      file,
      "invoice",
      organizationId
    );
    const items = [...(next[bucket] ?? [])];
    if (!items[index]) continue;
    items[index] = { ...items[index], invoice_document_id: doc.id };
    next[bucket] = items;
  }
  return next;
}

/** Remove invoice document references (e.g. when cloning an event). */
export function stripLineItemInvoiceRefs(
  workflow: PlaybookWorkflow
): PlaybookWorkflow {
  const stripBucket = (
    items: PlaybookWorkflow["food_items"]
  ): PlaybookWorkflow["food_items"] =>
    items?.map(({ invoice_document_id: _removed, ...rest }) => rest);

  return {
    ...workflow,
    food_items: stripBucket(workflow.food_items),
    entertainment_items: stripBucket(workflow.entertainment_items),
    bike_activities_items: stripBucket(workflow.bike_activities_items),
    engagement_items: stripBucket(workflow.engagement_items),
  };
}
