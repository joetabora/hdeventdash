"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getEvent,
  getEvents,
  getChecklistItems,
  getEventDocuments,
  getEventComments,
  getEventMedia,
  updateEvent,
  deleteEvent,
} from "@/lib/events";
import { getVendors, getActiveEventVendors } from "@/lib/vendors";
import {
  Event,
  ChecklistItem,
  EventDocument,
  EventComment,
  EventMedia,
  Vendor,
  EventVendorWithVendor,
  CHECKLIST_SECTIONS,
  EVENT_STATUSES,
  EventStatus,
  EventType,
} from "@/types/database";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EventForm } from "@/components/events/event-form";
import { ChecklistSectionComponent } from "@/components/events/checklist-section";
import { DocumentManager } from "@/components/events/document-manager";
import { CommentsSection } from "@/components/events/comments-section";
import { MediaGallery } from "@/components/events/media-gallery";
import { AiAssistant } from "@/components/events/ai-assistant";
import { EventRecap } from "@/components/events/event-recap";
import { EventRoiSection } from "@/components/events/event-roi-section";
import { EventVendorsSection } from "@/components/vendors/event-vendors-section";
import { EventMobileActionBar } from "@/components/events/event-mobile-action-bar";
import { ProgressBar } from "@/components/events/progress-bar";
import { DaysUntilEvent } from "@/components/events/days-until";
import { isEventAtRisk } from "@/lib/at-risk";
import {
  ArrowLeft,
  Loader2,
  Edit,
  Trash2,
  Zap,
  ZapOff,
  ExternalLink,
  CalendarDays,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  Image as ImageIcon,
  FileText,
  MessageSquare,
  BarChart3,
  Sparkles,
  ChevronDown,
  DollarSign,
  Store,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useAppRole } from "@/contexts/app-role-context";

function formatEventMoney(n: number | null | undefined): string {
  if (n == null || n === undefined || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(n));
}

function CollapsibleSection({
  icon,
  title,
  count,
  defaultOpen = true,
  mobileCollapsed = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  mobileCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mb-8 md:mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 mb-4 w-full group"
      >
        <span className="text-harley-text-muted">{icon}</span>
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-xs text-harley-text-muted bg-harley-gray-light/50 rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
        <div className="flex-1 border-t border-harley-gray/40 ml-2" />
        <ChevronDown
          className={`w-4 h-4 text-harley-text-muted transition-transform duration-200 ${
            open ? "rotate-0" : "-rotate-90"
          } ${mobileCollapsed ? "md:hidden" : ""}`}
        />
      </button>
      {open && <div className="animate-fade-in-up">{children}</div>}
    </section>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canManageEvents, isAdmin } = useAppRole();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );

  const [event, setEvent] = useState<Event | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [documents, setDocuments] = useState<EventDocument[]>([]);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [media, setMedia] = useState<EventMedia[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [eventVendors, setEventVendors] = useState<EventVendorWithVendor[]>([]);
  const [allEventsForBudget, setAllEventsForBudget] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showStatusPills, setShowStatusPills] = useState(false);

  const loadAll = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      const [ev, cl, docs, coms, med, vendors, evVendors, orgEvents] =
        await Promise.all([
          getEvent(supabase, id),
          getChecklistItems(supabase, id),
          getEventDocuments(supabase, id),
          getEventComments(supabase, id),
          getEventMedia(supabase, id),
          getVendors(supabase).catch(() => [] as Vendor[]),
          getActiveEventVendors(supabase, id).catch(
            () => [] as EventVendorWithVendor[]
          ),
          getEvents(supabase).catch(() => [] as Event[]),
        ]);
      setEvent(ev);
      setChecklist(cl);
      setDocuments(docs);
      setComments(coms);
      setMedia(med);
      setAllVendors(vendors);
      setEventVendors(evVendors);
      setAllEventsForBudget(orgEvents.filter((e) => !e.is_archived));
    } catch (err) {
      console.error("Failed to load event:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const root = document.documentElement;
    if (event?.is_live_mode) {
      root.classList.add("event-live-shell");
    } else {
      root.classList.remove("event-live-shell");
    }
    return () => root.classList.remove("event-live-shell");
  }, [event?.is_live_mode]);

  const allChecklistComplete = useMemo(() => {
    return checklist.length > 0 && checklist.every((item) => item.is_checked);
  }, [checklist]);

  const atRisk = useMemo(() => {
    if (!event) return false;
    const completed = checklist.filter((i) => i.is_checked).length;
    return isEventAtRisk(event.date, event.status, checklist.length, completed);
  }, [event, checklist]);

  const isLiveMode = event?.is_live_mode ?? false;

  async function handleToggleLiveMode() {
    if (!event || !supabaseRef.current) return;
    await updateEvent(supabaseRef.current, event.id, {
      is_live_mode: !event.is_live_mode,
    });
    loadAll();
  }

  async function handleStatusChange(newStatus: EventStatus) {
    if (!event || !supabaseRef.current) return;
    await updateEvent(supabaseRef.current, event.id, { status: newStatus });
    loadAll();
  }

  async function handleEditSubmit(data: {
    name: string;
    date: string;
    location: string;
    owner: string;
    status: string;
    description: string;
    onedrive_link: string;
    event_type: EventType | null;
    planned_budget: number | null;
    actual_budget: number | null;
  }) {
    if (!event || !supabaseRef.current) return;
    await updateEvent(supabaseRef.current, event.id, {
      ...data,
      status: data.status as EventStatus,
      onedrive_link: data.onedrive_link || null,
      event_type: data.event_type,
      planned_budget: data.planned_budget,
      actual_budget: data.actual_budget,
    });
    setEditModalOpen(false);
    loadAll();
  }

  async function handleDelete() {
    if (!event || !supabaseRef.current) return;
    if (!confirm("Are you sure you want to delete this event? This cannot be undone."))
      return;
    await deleteEvent(supabaseRef.current, event.id);
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-harley-text-muted">Event not found</p>
      </div>
    );
  }

  // Live Mode — checklist-first, large type, minimal chrome (sidebar hidden via .event-live-shell)
  if (isLiveMode) {
    return (
      <>
      <div className="w-full max-w-2xl mx-auto pb-28 md:pb-8 safe-bottom space-y-5 sm:space-y-6">
        {/* Key actions — sticky for thumb reach on mobile */}
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
                onClick={() => handleStatusChange("live_event")}
              >
                <Zap className="w-5 h-5" />
                Mark as Live Event
              </Button>
            )}
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto min-h-12 text-base"
              onClick={handleToggleLiveMode}
            >
              <ZapOff className="w-5 h-5" />
              Exit Live Mode
            </Button>
          </div>
        </div>

        {/* Title + key context */}
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

        <ProgressBar variant="live" checklist={checklist} />

        {atRisk && (
          <div className="p-4 rounded-xl bg-harley-danger/10 border border-harley-danger/30 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-harley-danger shrink-0 mt-0.5" />
            <p className="text-base sm:text-lg text-harley-danger font-medium leading-snug">
              At risk: event soon and checklist not complete. Prioritize open tasks.
            </p>
          </div>
        )}

        {allChecklistComplete && (
          <div className="p-4 sm:p-5 rounded-xl bg-harley-success/10 border border-harley-success/35 flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-harley-success shrink-0" />
            <span className="text-base sm:text-lg text-harley-success font-semibold">
              All checklist items complete — great work!
            </span>
          </div>
        )}

        <div className="space-y-4 sm:space-y-5 pt-1">
          {CHECKLIST_SECTIONS.map((section) => {
            const items = checklist.filter((item) => item.section === section);
            return (
              <ChecklistSectionComponent
                key={section}
                section={section}
                items={items}
                eventId={event.id}
                onUpdate={loadAll}
                liveMode
                allowStructureEdit={canManageEvents}
              />
            );
          })}
        </div>
      </div>
      <EventMobileActionBar
        eventId={event.id}
        checklist={checklist}
        onUpdate={loadAll}
        canManageExtras={canManageEvents}
      />
      </>
    );
  }

  const completedCount = checklist.filter((i) => i.is_checked).length;
  const totalCount = checklist.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <>
      <div className="max-w-5xl pb-28 md:pb-0">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-4 md:mb-5 transition-colors py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* ── STICKY HEADER ─────────────────────────────────────── */}
        <div className="sticky top-16 z-10 -mx-2 px-2 pb-3 md:pb-4 pt-1 bg-harley-black/80 backdrop-blur-xl">
          <Card padding="none">
            {/* Title + badges + actions */}
            <div className="px-4 py-3 md:px-5 md:py-4">
              <div className="flex items-start justify-between gap-3 mb-2 md:mb-0">
                {/* Left: Title + badges */}
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

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={handleToggleLiveMode} className="!px-2.5 md:!px-3">
                    <Zap className="w-4 h-4" />
                    <span className="hidden md:inline">Live Mode</span>
                  </Button>
                  {canManageEvents && (
                    <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)} className="!px-2.5 md:!px-3">
                      <Edit className="w-4 h-4" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="danger" size="sm" onClick={handleDelete} className="!px-2.5 md:!px-3">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Key stats row — always visible */}
              <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-harley-text-muted mt-1">
                <DaysUntilEvent date={event.date} size="sm" />
                <span className="flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" />
                  {completedCount}/{totalCount}
                </span>
              </div>
            </div>

            {/* Inline progress strip */}
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

        {/* ── EVENT INFO + STATUS ───────────────────────────────── */}
        <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
          {/* At-risk alert */}
          {atRisk && (
            <div className="p-3.5 md:p-4 rounded-xl bg-harley-danger/8 border border-harley-danger/25 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-harley-danger shrink-0" />
              <div>
                <span className="text-sm font-semibold text-harley-danger">At Risk — </span>
                <span className="text-sm text-harley-danger/80">
                  Event is within 5 days and checklist is not complete.
                </span>
              </div>
            </div>
          )}

          {/* Readiness suggestion */}
          {allChecklistComplete &&
            event.status !== "ready_for_execution" &&
            event.status !== "live_event" &&
            event.status !== "completed" && (
              <div className="p-3.5 md:p-4 rounded-xl bg-harley-orange/8 border border-harley-orange/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-harley-orange shrink-0" />
                  <span className="text-sm text-harley-orange">
                    All checklist items complete. Update status to &quot;Ready for Execution&quot;?
                  </span>
                </div>
                {canManageEvents && (
                  <Button size="sm" onClick={() => handleStatusChange("ready_for_execution")} className="w-full sm:w-auto">
                    Update Status
                  </Button>
                )}
              </div>
            )}

          {/* Info card */}
          <Card className="!p-3.5 md:!p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-harley-text-muted">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  <span className="truncate">{format(parseISO(event.date), "MMM d, yyyy")}</span>
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
                  <span>Planned: {formatEventMoney(event.planned_budget)}</span>
                  <span>Actual: {formatEventMoney(event.actual_budget)}</span>
                </div>
                {canManageEvents && (
                  <p className="text-xs text-harley-text-muted/80 mt-2">
                    Edit planned and actual amounts when you open Edit event.
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Status pills — collapsed on mobile behind a toggle */}
          {canManageEvents && (
            <div>
              <button
                onClick={() => setShowStatusPills(!showStatusPills)}
                className="md:hidden flex items-center gap-2 text-xs text-harley-text-muted mb-2 py-1"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showStatusPills ? "" : "-rotate-90"}`} />
                Change Status
              </button>
              <div className={`flex flex-wrap gap-1.5 ${showStatusPills ? "" : "hidden md:flex"}`}>
                {EVENT_STATUSES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleStatusChange(value)}
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

        {/* ── CHECKLIST (always open) ──────────────────────────── */}
        <CollapsibleSection
          icon={<ClipboardList className="w-4.5 h-4.5" />}
          title="Checklist"
          defaultOpen={true}
        >
          <div className="space-y-3">
            {CHECKLIST_SECTIONS.map((section) => {
              const items = checklist.filter((item) => item.section === section);
              return (
                <ChecklistSectionComponent
                  key={section}
                  section={section}
                  items={items}
                  eventId={event.id}
                  onUpdate={loadAll}
                  allowStructureEdit={canManageEvents}
                />
              );
            })}
          </div>
        </CollapsibleSection>

        {/* ── VENDORS ─────────────────────────────────────────── */}
        <CollapsibleSection
          icon={<Store className="w-4.5 h-4.5" />}
          title="Vendors"
          count={eventVendors.length}
          defaultOpen={typeof window !== "undefined" && window.innerWidth >= 768}
          mobileCollapsed
        >
          <EventVendorsSection
            eventId={event.id}
            eventVendors={eventVendors}
            allVendors={allVendors}
            onUpdate={loadAll}
            canMutate={canManageEvents}
          />
        </CollapsibleSection>

        {/* ── FILES & MEDIA (collapsed on mobile) ─────────────── */}
        <CollapsibleSection
          icon={<ImageIcon className="w-4.5 h-4.5" />}
          title="Files & Media"
          count={(media?.length ?? 0) + (documents?.length ?? 0)}
          defaultOpen={typeof window !== "undefined" && window.innerWidth >= 768}
          mobileCollapsed
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MediaGallery
              eventId={event.id}
              media={media}
              onUpdate={loadAll}
              canMutate={canManageEvents}
            />
            <DocumentManager
              eventId={event.id}
              documents={documents}
              onUpdate={loadAll}
              canMutate={canManageEvents}
            />
          </div>
        </CollapsibleSection>

        {/* ── AI ASSISTANT (collapsed on mobile) ──────────────── */}
        <CollapsibleSection
          icon={<Sparkles className="w-4.5 h-4.5" />}
          title="AI Assistant"
          defaultOpen={typeof window !== "undefined" && window.innerWidth >= 768}
          mobileCollapsed
        >
          <AiAssistant event={event} />
        </CollapsibleSection>

        {/* ── COMMENTS (collapsed on mobile) ──────────────────── */}
        <CollapsibleSection
          icon={<MessageSquare className="w-4.5 h-4.5" />}
          title="Comments"
          count={comments.length}
          defaultOpen={typeof window !== "undefined" && window.innerWidth >= 768}
          mobileCollapsed
        >
          <CommentsSection
            eventId={event.id}
            comments={comments}
            onUpdate={loadAll}
            canPost={canManageEvents}
            canDelete={canManageEvents}
          />
        </CollapsibleSection>

        {/* ── ROI & OUTCOMES ─────────────────────────────────── */}
        <CollapsibleSection
          icon={<DollarSign className="w-4.5 h-4.5" />}
          title="ROI & outcomes"
          defaultOpen={typeof window !== "undefined" && window.innerWidth >= 768}
          mobileCollapsed
        >
          <EventRoiSection
            event={event}
            onUpdate={loadAll}
            canEdit={canManageEvents}
          />
        </CollapsibleSection>

        {/* ── RECAP (collapsed on mobile) ─────────────────────── */}
        {(event.status === "completed" || event.status === "live_event") && (
          <CollapsibleSection
            icon={<BarChart3 className="w-4.5 h-4.5" />}
            title="Event Recap"
            defaultOpen={typeof window !== "undefined" && window.innerWidth >= 768}
            mobileCollapsed
          >
            <EventRecap event={event} onUpdate={loadAll} canEdit={canManageEvents} />
          </CollapsibleSection>
        )}
      </div>

      {/* Edit Modal */}
      {canManageEvents && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Event"
          size="lg"
        >
          <EventForm
            event={event}
            canEditBudget={canManageEvents}
            allEvents={allEventsForBudget}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditModalOpen(false)}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

      <EventMobileActionBar
        eventId={event.id}
        checklist={checklist}
        onUpdate={loadAll}
        canManageExtras={canManageEvents}
      />
    </>
  );
}
