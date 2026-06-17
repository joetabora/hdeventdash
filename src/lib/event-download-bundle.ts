import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";

import { prepareClonedDocumentForHtml2Canvas } from "@/lib/html2canvas-capture";
import { createSignedEventDocumentUrls } from "@/lib/events";
import type { EventDocument, EventMedia } from "@/types/database";

function safeFolderName(name: string): string {
  const trimmed = name.replace(/[^\w\s-]/g, "").trim().slice(0, 60);
  return trimmed || "event";
}

function safeZipEntryName(name: string): string {
  const trimmed = name.replace(/[/\\:*?"<>|]/g, "_").trim();
  return trimmed || "file";
}

function uniqueZipEntryName(name: string, used: Set<string>): string {
  let base = safeZipEntryName(name);
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const dot = base.lastIndexOf(".");
    candidate =
      dot > 0
        ? `${base.slice(0, dot)} (${n})${base.slice(dot)}`
        : `${base} (${n})`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

async function waitForImages(container: HTMLElement, timeoutMs = 15000): Promise<void> {
  const imgs = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          window.setTimeout(done, timeoutMs);
        })
    )
  );
}

async function generateReportPdfBlob(element: HTMLElement): Promise<Blob> {
  await waitForImages(element);
  const html2pdf = (await import("html2pdf.js")).default;
  return html2pdf()
    .set({
      margin: [0.45, 0.45, 0.45, 0.45],
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
          prepareClonedDocumentForHtml2Canvas(clonedDoc, clonedElement);
        },
      },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    })
    .from(element)
    .outputPdf("blob");
}

async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export type DownloadEventBundleInput = {
  eventName: string;
  reportElement: HTMLElement;
  documents: EventDocument[];
  media: EventMedia[];
  supabase: SupabaseClient;
};

/** Build a zip with the executive report PDF plus all uploaded documents and media. */
export async function downloadEventBundle({
  eventName,
  reportElement,
  documents,
  media,
  supabase,
}: DownloadEventBundleInput): Promise<void> {
  const folder = safeFolderName(eventName);
  const zip = new JSZip();
  const root = zip.folder(folder);
  if (!root) throw new Error("Could not create download archive.");

  const pdfBlob = await generateReportPdfBlob(reportElement);
  root.file(`${folder} — Event Report.pdf`, pdfBlob);

  const paths = [
    ...documents.map((d) => d.file_path),
    ...media.map((m) => m.file_path),
  ];
  const signedUrls = await createSignedEventDocumentUrls(supabase, paths, 3600);

  const usedDocNames = new Set<string>();
  const usedMediaNames = new Set<string>();
  const docsFolder = root.folder("documents");
  const mediaFolder = root.folder("media");

  await Promise.all([
    ...documents.map(async (doc) => {
      const url = signedUrls.get(doc.file_path);
      if (!url || !docsFolder) return;
      const blob = await fetchBlob(url);
      if (!blob) return;
      const entryName = uniqueZipEntryName(doc.file_name, usedDocNames);
      docsFolder.file(entryName, blob);
    }),
    ...media.map(async (item) => {
      const url = signedUrls.get(item.file_path);
      if (!url || !mediaFolder) return;
      const blob = await fetchBlob(url);
      if (!blob) return;
      const entryName = uniqueZipEntryName(item.file_name, usedMediaNames);
      mediaFolder.file(entryName, blob);
    }),
  ]);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(zipBlob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${folder} — Event Package.zip`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
