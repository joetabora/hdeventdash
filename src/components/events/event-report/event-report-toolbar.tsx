"use client";

import Link from "next/link";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonStyles } from "@/components/ui/button";

interface EventReportToolbarProps {
  eventId: string;
  eventName: string;
  preparingPrint?: boolean;
  onPrint: () => void;
  onSavePdf: () => void;
}

export function EventReportToolbar({
  eventId,
  eventName,
  preparingPrint,
  onPrint,
  onSavePdf,
}: EventReportToolbarProps) {
  return (
    <div className="event-report-screen-only mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <Link
          href={`/events/${eventId}`}
          className={`${buttonStyles.secondary("sm")} w-fit gap-2`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to event
        </Link>
        <p className="truncate text-sm text-harley-text-muted">
          Executive report for <span className="text-harley-text">{eventName}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={preparingPrint}
          onClick={onPrint}
          className="gap-2"
        >
          {preparingPrint ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Printer className="h-4 w-4" aria-hidden />
          )}
          Print
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={preparingPrint}
          onClick={onSavePdf}
          className="gap-2"
          title="Opens the print dialog — choose Save as PDF"
        >
          <Download className="h-4 w-4" aria-hidden />
          Save as PDF
        </Button>
      </div>
    </div>
  );
}
