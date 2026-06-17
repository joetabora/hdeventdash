"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildEventReportModel } from "@/lib/event-report/build-event-report-model";
import type { EventReportDataBundle } from "@/lib/event-report/types";
import { downloadEventBundle } from "@/lib/event-download-bundle";
import { createSignedEventDocumentUrls } from "@/lib/events";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, showError, showSuccess } from "@/lib/toast";

export function useEventDownloadBundle(bundle: EventReportDataBundle) {
  const model = useMemo(() => buildEventReportModel(bundle), [bundle]);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [resolvedImagePathKey, setResolvedImagePathKey] = useState<string | null>(
    null
  );
  const [downloading, setDownloading] = useState(false);

  const imageRefs = useMemo(() => {
    const section = model.sections.find((s) => s.id === "images");
    return section && section.id === "images" ? section.images : [];
  }, [model.sections]);

  const imagePathKey = useMemo(
    () => imageRefs.map((i) => i.filePath).join("\0"),
    [imageRefs]
  );

  const hasReportImages = imagePathKey.length > 0;
  const imagesLoading = hasReportImages && resolvedImagePathKey !== imagePathKey;

  useEffect(() => {
    if (!hasReportImages) {
      setImageUrls({});
      setResolvedImagePathKey(imagePathKey);
      return;
    }
    let cancelled = false;
    const paths = imageRefs.map((i) => i.filePath);
    const supabase = getSupabaseBrowserClient();
    void createSignedEventDocumentUrls(supabase, paths, 3600).then((map) => {
      if (cancelled) return;
      const byId: Record<string, string> = {};
      for (const ref of imageRefs) {
        const url = map.get(ref.filePath);
        if (url) byId[ref.mediaId] = url;
      }
      setImageUrls(byId);
      setResolvedImagePathKey(imagePathKey);
    });
    return () => {
      cancelled = true;
    };
  }, [bundle.event.id, hasReportImages, imagePathKey, imageRefs]);

  const download = useCallback(async () => {
    const reportElement = reportContainerRef.current?.querySelector(
      ".event-report-print"
    );
    if (!(reportElement instanceof HTMLElement)) {
      showError("Report is not ready yet. Try again in a moment.");
      return;
    }
    if (imagesLoading) {
      showError("Report images are still loading. Try again in a moment.");
      return;
    }

    setDownloading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await downloadEventBundle({
        eventName: bundle.event.name,
        reportElement,
        documents: bundle.documents,
        media: bundle.media,
        supabase,
      });
      showSuccess("Download started.");
    } catch (err) {
      console.error(err);
      showError(errorMessage(err, "Could not prepare download."));
    } finally {
      setDownloading(false);
    }
  }, [
    bundle.documents,
    bundle.event.name,
    bundle.media,
    imagesLoading,
  ]);

  return {
    model,
    imageUrls,
    downloading,
    download,
    reportContainerRef,
  };
}
