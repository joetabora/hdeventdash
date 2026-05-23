"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { buildEventReportModel } from "@/lib/event-report/build-event-report-model";
import type { EventReportDataBundle } from "@/lib/event-report/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createSignedEventDocumentUrls } from "@/lib/events";
import { EventReportDocument } from "@/components/events/event-report/event-report-document";
import { EventReportToolbar } from "@/components/events/event-report/event-report-toolbar";
import { PageHeader } from "@/components/ui/page-header";

export function EventReportClient(bundle: EventReportDataBundle) {
  const model = useMemo(() => buildEventReportModel(bundle), [bundle]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [resolvedImagePathKey, setResolvedImagePathKey] = useState<string | null>(
    null
  );
  const [preparingPrint, setPreparingPrint] = useState(false);
  const printTitleRef = useRef<string | null>(null);

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
    if (!hasReportImages) return;
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

  const runPrint = useCallback(async () => {
    setPreparingPrint(true);
    const safeName = bundle.event.name.replace(/[^\w\s-]/g, "").trim().slice(0, 60);
    printTitleRef.current = document.title;
    document.title = safeName ? `${safeName} — Event Report` : "Event Report";
    if (imagesLoading) {
      await new Promise((r) => setTimeout(r, 400));
    }
    window.print();
    window.setTimeout(() => {
      if (printTitleRef.current) document.title = printTitleRef.current;
      setPreparingPrint(false);
    }, 500);
  }, [bundle.event.name, imagesLoading]);

  return (
    <div id="event-report-root" className="event-report-root mx-auto max-w-4xl pb-16">
      <PageHeader
        kicker="Printable report"
        title={bundle.event.name}
        description="Executive summary built from your playbook data. Empty sections are omitted automatically."
        className="event-report-screen-only mb-6"
      />

      <EventReportToolbar
        eventId={bundle.event.id}
        eventName={bundle.event.name}
        preparingPrint={preparingPrint}
        onPrint={() => void runPrint()}
        onSavePdf={() => void runPrint()}
      />

      {imagesLoading ? (
        <div className="event-report-screen-only mb-4 flex items-center gap-2 text-sm text-harley-text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-harley-orange" aria-hidden />
          Loading report imagery…
        </div>
      ) : null}

      <EventReportDocument model={model} imageUrls={imageUrls} />
    </div>
  );
}
