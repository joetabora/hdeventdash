"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getEvent,
  getChecklistItems,
  getEventDocuments,
  getEventComments,
  getEventMedia,
  updateEvent,
  deleteEvent,
} from "@/lib/events";
import {
  Event,
  ChecklistItem,
  EventDocument,
  EventComment,
  EventMedia,
  CHECKLIST_SECTIONS,
  EVENT_STATUSES,
  EventStatus,
} from "@/types/database";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EventForm } from "@/components/events/event-form";
import { ChecklistSectionComponent } from "@/components/events/checklist-section";
import { DocumentManager } from "@/components/events/document-manager";
import { CommentsSection } from "@/components/events/comments-section";
import { MediaGallery } from "@/components/events/media-gallery";
import { AiAssistant } from "@/components/events/ai-assistant";
import { EventRecap } from "@/components/events/event-recap";
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
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );

  const [event, setEvent] = useState<Event | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [documents, setDocuments] = useState<EventDocument[]>([]);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [media, setMedia] = useState<EventMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadAll = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      const [ev, cl, docs, coms, med] = await Promise.all([
        getEvent(supabase, id),
        getChecklistItems(supabase, id),
        getEventDocuments(supabase, id),
        getEventComments(supabase, id),
        getEventMedia(supabase, id),
      ]);
      setEvent(ev);
      setChecklist(cl);
      setDocuments(docs);
      setComments(coms);
      setMedia(med);
    } catch (err) {
      console.error("Failed to load event:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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
  }) {
    if (!event || !supabaseRef.current) return;
    await updateEvent(supabaseRef.current, event.id, {
      ...data,
      status: data.status as EventStatus,
      onedrive_link: data.onedrive_link || null,
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

  // Live Mode
  if (isLiveMode) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-harley-success animate-pulse" />
            <h1 className="text-2xl font-bold text-harley-text">
              {event.name}
            </h1>
            <Badge variant="success">LIVE</Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={handleToggleLiveMode}>
            <ZapOff className="w-4 h-4" />
            Exit Live Mode
          </Button>
        </div>

        <ProgressBar checklist={checklist} />

        {allChecklistComplete && (
          <div className="mb-6 p-4 rounded-xl bg-harley-success/10 border border-harley-success/30 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-harley-success" />
            <span className="text-sm text-harley-success font-medium">
              All checklist items complete!
            </span>
          </div>
        )}

        <div className="space-y-4">
          {CHECKLIST_SECTIONS.map((section) => {
            const items = checklist.filter((item) => item.section === section);
            return (
              <ChecklistSectionComponent
                key={section}
                section={section}
                items={items}
                eventId={event.id}
                onUpdate={loadAll}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const completedCount = checklist.filter((i) => i.is_checked).length;
  const totalCount = checklist.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Full detail view
  return (
    <>
      <div className="max-w-5xl">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* ── SECTION 1: Sticky Header ─────────────────────────── */}
        <div className="sticky top-16 z-10 -mx-2 px-2 pb-4 pt-1 bg-harley-black/80 backdrop-blur-xl">
          <Card padding="none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4">
              {/* Left: Title + badges */}
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <h1 className="text-xl font-bold text-harley-text truncate">
                  {event.name}
                </h1>
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

              {/* Right: Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={handleToggleLiveMode}>
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Live Mode</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Inline progress strip */}
            <div className="px-5 pb-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-harley-gray rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      percentage === 100
                        ? "bg-gradient-to-r from-harley-success to-emerald-400"
                        : "bg-gradient-to-r from-harley-orange-dark to-harley-orange"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className={`text-xs font-bold shrink-0 ${
                  percentage === 100 ? "text-harley-success" : "text-harley-orange"
                }`}>
                  {percentage}%
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── SECTION 2: Event Info + Status ───────────────────── */}
        <div className="space-y-4 mb-10">
          {/* At-risk alert */}
          {atRisk && (
            <div className="p-4 rounded-xl bg-harley-danger/8 border border-harley-danger/25 flex items-center gap-3">
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
              <div className="p-4 rounded-xl bg-harley-orange/8 border border-harley-orange/25 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-harley-orange" />
                  <span className="text-sm text-harley-orange">
                    All checklist items complete. Update status to &quot;Ready for Execution&quot;?
                  </span>
                </div>
                <Button size="sm" onClick={() => handleStatusChange("ready_for_execution")}>
                  Update Status
                </Button>
              </div>
            )}

          {/* Info row */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-harley-text-muted">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  {format(parseISO(event.date), "MMMM d, yyyy")}
                </span>
                <DaysUntilEvent date={event.date} size="md" />
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {event.location}
                  </span>
                )}
                {event.owner && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {event.owner}
                  </span>
                )}
                {event.onedrive_link && (
                  <a
                    href={event.onedrive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-harley-orange hover:text-harley-orange-light transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    OneDrive
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-harley-text-muted">
                <ClipboardList className="w-3.5 h-3.5" />
                {completedCount}/{totalCount} tasks
              </div>
            </div>
            {event.description && (
              <p className="mt-3 pt-3 border-t border-harley-gray/50 text-sm text-harley-text-muted leading-relaxed">
                {event.description}
              </p>
            )}
          </Card>

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            {EVENT_STATUSES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleStatusChange(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
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

        {/* ── SECTION 3: Checklist ─────────────────────────────── */}
        <section className="mb-10">
          <SectionHeading icon={<ClipboardList className="w-4.5 h-4.5" />} title="Checklist" />
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
                />
              );
            })}
          </div>
        </section>

        {/* ── SECTION 4: Media + Documents (2-col) ─────────────── */}
        <section className="mb-10">
          <SectionHeading icon={<ImageIcon className="w-4.5 h-4.5" />} title="Files & Media" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MediaGallery eventId={event.id} media={media} onUpdate={loadAll} />
            <DocumentManager eventId={event.id} documents={documents} onUpdate={loadAll} />
          </div>
        </section>

        {/* ── SECTION 5: AI Assistant ──────────────────────────── */}
        <section className="mb-10">
          <SectionHeading icon={<Sparkles className="w-4.5 h-4.5" />} title="AI Assistant" />
          <AiAssistant event={event} />
        </section>

        {/* ── SECTION 6: Comments ──────────────────────────────── */}
        <section className="mb-10">
          <SectionHeading icon={<MessageSquare className="w-4.5 h-4.5" />} title="Comments" count={comments.length} />
          <CommentsSection eventId={event.id} comments={comments} onUpdate={loadAll} />
        </section>

        {/* ── SECTION 7: Recap ─────────────────────────────────── */}
        {(event.status === "completed" || event.status === "live_event") && (
          <section className="mb-10">
            <SectionHeading icon={<BarChart3 className="w-4.5 h-4.5" />} title="Event Recap" />
            <EventRecap event={event} onUpdate={loadAll} />
          </section>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Event"
        size="lg"
      >
        <EventForm
          event={event}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditModalOpen(false)}
          submitLabel="Save Changes"
        />
      </Modal>
    </>
  );
}

function SectionHeading({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
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
    </div>
  );
}
