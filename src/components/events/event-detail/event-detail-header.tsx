"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Event,
  EVENT_STATUSES,
  EventStatus,
} from "@/types/database";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DaysUntilEvent } from "@/components/events/days-until";
import { formatUsdNullable } from "@/lib/format-currency";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Zap,
  ZapOff,
  ExternalLink,
  CalendarDays,
  MapPin,
  User,
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  ChevronDown,
  Wallet,
} from "lucide-react";

export type EventDetailHeaderLiveProps = {
  mode: "live";
  event: Event;
  canManageEvents: boolean;
  onExitLiveMode: () => void;
  onMarkLiveEvent: () => void | Promise<void>;
};

export type EventDetailHeaderStandardProps = {
  mode: "standard";
  event: Event;
  canManageEvents: boolean;
  isAdmin: boolean;
  atRisk: boolean;
  allChecklistComplete: boolean;
  completedCount: number;
  totalCount: number;
  percentage: number;
  showStatusPills: boolean;
  setShowStatusPills: Dispatch<SetStateAction<boolean>>;
  onToggleLiveMode: () => void | Promise<void>;
  onOpenEdit: () => void;
  onDelete: () => void | Promise<void>;
  onStatusChange: (s: EventStatus) => void | Promise<void>;
};

export type EventDetailHeaderProps =
  | EventDetailHeaderLiveProps
  | EventDetailHeaderStandardProps;

export function EventDetailHeader(props: EventDetailHeaderProps) {
  if (props.mode === "live") {
    const {
      event,
      canManageEvents,
      onExitLiveMode,
      onMarkLiveEvent,
    } = props;
    return (
      <>
        <div className="sticky top-0 z-10 -mx-1 px-1 py-3 sm:py-4 bg-harley-black/95 backdrop-blur-md border-b border-harley-gray/50 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link
            href="/dashboard"
            className={`${buttonStyles.secondary("md")} justify-center min-h-12 sm:min-h-11 w-full sm:w-auto order-2 sm:order-1`}
          >
            <ArrowLeft className="w-5 h-5" />
            Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
            {canManageEvents &&
              event.status !== "live_event" &&
              event.status !== "completed" && (
                <Button
                  size="lg"
                  className="w-full sm:w-auto min-h-12 text-base"
                  onClick={() => void onMarkLiveEvent()}
                >
                  <Zap className="w-5 h-5" />
                  Mark as Live Event
                </Button>
              )}
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto min-h-12 text-base"
              onClick={() => void onExitLiveMode()}
            >
              <ZapOff className="w-5 h-5" />
              Exit Live Mode
            </Button>
          </div>
        </div>

        <div className="text-center space-y-3 sm:space-y-4 px-1">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="w-3.5 h-3.5 rounded-full bg-harley-success animate-pulse" />
            <Badge variant="success" className="text-xs sm:text-sm px-3 py-1">
              LIVE MODE
            </Badge>
            <StatusBadge status={event.status} />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-harley-text leading-tight px-1">
            {event.name}
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-harley-text-muted">
            <span className="inline-flex items-center gap-2 text-base sm:text-lg">
              <CalendarDays className="w-5 h-5 shrink-0" />
              {format(parseISO(event.date), "EEEE, MMMM d")}
            </span>
            <DaysUntilEvent date={event.date} size="lg" />
          </div>
          {event.location && (
            <p className="inline-flex items-center justify-center gap-2 text-base text-harley-text-muted">
              <MapPin className="w-5 h-5 shrink-0 text-harley-orange" />
              {event.location}
            </p>
          )}
        </div>
      </>
    );
  }

  const {
    event,
    canManageEvents,
    isAdmin,
    atRisk,
    allChecklistComplete,
    completedCount,
    totalCount,
    percentage,
    showStatusPills,
    setShowStatusPills,
    onToggleLiveMode,
    onOpenEdit,
    onDelete,
    onStatusChange,
  } = props;

  return (
    <>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-4 md:mb-5 transition-colors py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="sticky top-16 z-10 -mx-2 px-2 pb-3 md:pb-4 pt-1 bg-harley-black/80 backdrop-blur-xl">
        <Card padding="none">
          <div className="px-4 py-3 md:px-5 md:py-4">
            <div className="flex items-start justify-between gap-3 mb-2 md:mb-0">
              <div className="flex flex-col gap-2 min-w-0 md:flex-row md:items-center md:gap-3 md:flex-wrap">
                <h1 className="text-lg md:text-xl font-bold text-harley-text leading-tight">
                  {event.name}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={event.status} />
                  {atRisk && <Badge variant="danger">At Risk</Badge>}
                  {allChecklistComplete &&
                    event.status !== "ready_for_execution" &&
                    event.status !== "live_event" &&
                    event.status !== "completed" && (
                      <Badge variant="orange">Ready</Badge>
                    )}
                  {event.is_live_mode && <Badge variant="success">LIVE</Badge>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void onToggleLiveMode()}
                  className="!px-2.5 md:!px-3"
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden md:inline">Live Mode</span>
                </Button>
                {canManageEvents && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onOpenEdit}
                    className="!px-2.5 md:!px-3"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden md:inline">Edit</span>
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void onDelete()}
                    className="!px-2.5 md:!px-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-harley-text-muted mt-1">
              <DaysUntilEvent date={event.date} size="sm" />
              <span className="flex items-center gap-1">
                <ClipboardList className="w-3.5 h-3.5" />
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>

          <div className="px-4 pb-3 md:px-5">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex-1 h-2.5 md:h-2 bg-harley-gray rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    percentage === 100
                      ? "bg-gradient-to-r from-harley-orange to-harley-orange-light"
                      : "bg-gradient-to-r from-harley-orange-dark to-harley-orange"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-bold shrink-0 text-harley-orange">
                {percentage}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
        {atRisk && (
          <div className="p-3.5 md:p-4 rounded-xl bg-harley-danger/8 border border-harley-danger/25 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-harley-danger shrink-0" />
            <div>
              <span className="text-sm font-semibold text-harley-danger">
                At Risk —{" "}
              </span>
              <span className="text-sm text-harley-danger/80">
                Event is within 5 days and checklist is not complete.
              </span>
            </div>
          </div>
        )}

        {allChecklistComplete &&
          event.status !== "ready_for_execution" &&
          event.status !== "live_event" &&
          event.status !== "completed" && (
            <div className="p-3.5 md:p-4 rounded-xl bg-harley-orange/8 border border-harley-orange/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-harley-orange shrink-0" />
                <span className="text-sm text-harley-orange">
                  All checklist items complete. Update status to &quot;Ready for
                  Execution&quot;?
                </span>
              </div>
              {canManageEvents && (
                <Button
                  size="sm"
                  onClick={() => void onStatusChange("ready_for_execution")}
                  className="w-full sm:w-auto"
                >
                  Update Status
                </Button>
              )}
            </div>
          )}

        <Card className="!p-3.5 md:!p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-harley-text-muted">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {format(parseISO(event.date), "MMM d, yyyy")}
                </span>
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </span>
              )}
              {event.owner && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 shrink-0" />
                  <span className="truncate">{event.owner}</span>
                </span>
              )}
              {event.onedrive_link && (
                <a
                  href={event.onedrive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-harley-orange hover:text-harley-orange-light transition-colors"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  OneDrive
                </a>
              )}
            </div>
          </div>
          {event.description && (
            <p className="mt-3 pt-3 border-t border-harley-gray/50 text-sm text-harley-text-muted leading-relaxed">
              {event.description}
            </p>
          )}
          {(event.planned_budget != null ||
            event.actual_budget != null ||
            canManageEvents) && (
            <div className="mt-3 pt-3 border-t border-harley-gray/50 text-sm">
              <div className="flex items-center gap-2 text-harley-text-muted mb-2">
                <Wallet className="w-4 h-4 text-harley-orange shrink-0" />
                <span className="font-medium text-harley-text">Budget</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-harley-text-muted">
                <span>Planned: {formatUsdNullable(event.planned_budget)}</span>
                <span>Actual: {formatUsdNullable(event.actual_budget)}</span>
              </div>
              {canManageEvents && (
                <p className="text-xs text-harley-text-muted/80 mt-2">
                  Edit planned and actual amounts when you open Edit event.
                </p>
              )}
            </div>
          )}
        </Card>

        {canManageEvents && (
          <div>
            <button
              type="button"
              onClick={() => setShowStatusPills(!showStatusPills)}
              className="md:hidden flex items-center gap-2 text-xs text-harley-text-muted mb-2 py-1"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${showStatusPills ? "" : "-rotate-90"}`}
              />
              Change Status
            </button>
            <div
              className={`flex flex-wrap gap-1.5 ${showStatusPills ? "" : "hidden md:flex"}`}
            >
              {EVENT_STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void onStatusChange(value)}
                  className={`px-3 py-1.5 md:py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                    event.status === value
                      ? "bg-harley-orange text-white shadow-sm shadow-harley-orange/20"
                      : "bg-harley-gray-light/40 text-harley-text-muted hover:bg-harley-gray-light hover:text-harley-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
