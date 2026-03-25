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
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EventForm } from "@/components/events/event-form";
import { ChecklistSectionComponent } from "@/components/events/checklist-section";
import { DocumentManager } from "@/components/events/document-manager";
import { CommentsSection } from "@/components/events/comments-section";
import { MediaGallery } from "@/components/events/media-gallery";
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
      <div className="flex min-h-screen bg-harley-black">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen bg-harley-black">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-harley-text-muted">Event not found</p>
        </main>
      </div>
    );
  }

  // Live Mode - simplified view
  if (isLiveMode) {
    return (
      <div className="flex min-h-screen bg-harley-black">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-harley-success animate-pulse" />
                <h1 className="text-2xl font-bold text-harley-text">
                  {event.name}
                </h1>
                <Badge variant="success">LIVE</Badge>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleToggleLiveMode}
              >
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
                const items = checklist.filter(
                  (item) => item.section === section
                );
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
        </main>
      </div>
    );
  }

  // Full detail view
  return (
    <div className="flex min-h-screen bg-harley-black">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8 max-w-4xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <ProgressBar checklist={checklist} />

          {atRisk && (
            <div className="mb-6 p-4 rounded-xl bg-harley-danger/10 border border-harley-danger/30 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-harley-danger shrink-0" />
              <div>
                <span className="text-sm font-semibold text-harley-danger">
                  At Risk
                </span>
                <span className="text-sm text-harley-danger/80 ml-2">
                  This event is within 5 days and the checklist is not complete.
                </span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="bg-harley-dark rounded-xl border border-harley-gray p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-harley-text">
                    {event.name}
                  </h1>
                  <StatusBadge status={event.status} />
                  {allChecklistComplete &&
                    event.status !== "ready_for_execution" &&
                    event.status !== "live_event" &&
                    event.status !== "completed" && (
                      <Badge variant="orange">Ready for Execution</Badge>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-harley-text-muted">
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
                </div>

                {event.description && (
                  <p className="text-sm text-harley-text-muted max-w-xl">
                    {event.description}
                  </p>
                )}

                {event.onedrive_link && (
                  <a
                    href={event.onedrive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-harley-orange hover:text-harley-orange-light"
                  >
                    <ExternalLink className="w-4 h-4" />
                    OneDrive Folder
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToggleLiveMode}
                >
                  <Zap className="w-4 h-4" />
                  Live Mode
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Status change + readiness alert */}
            {allChecklistComplete &&
              event.status !== "ready_for_execution" &&
              event.status !== "live_event" &&
              event.status !== "completed" && (
                <div className="mt-4 p-3 rounded-lg bg-harley-orange/10 border border-harley-orange/30 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-harley-orange" />
                    <span className="text-sm text-harley-orange">
                      All checklist items are complete. Update status to
                      &quot;Ready for Execution&quot;?
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("ready_for_execution")}
                  >
                    Update Status
                  </Button>
                </div>
              )}

            {/* Quick status buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              {EVENT_STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    event.status === value
                      ? "bg-harley-orange text-white"
                      : "bg-harley-gray text-harley-text-muted hover:bg-harley-gray-light"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-harley-text">
              Checklist
            </h2>
            {CHECKLIST_SECTIONS.map((section) => {
              const items = checklist.filter(
                (item) => item.section === section
              );
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

          {/* Documents */}
          <div className="mb-6">
            <DocumentManager
              eventId={event.id}
              documents={documents}
              onUpdate={loadAll}
            />
          </div>

          {/* Media */}
          <div className="mb-6">
            <MediaGallery
              eventId={event.id}
              media={media}
              onUpdate={loadAll}
            />
          </div>

          {/* Comments */}
          <div className="mb-6">
            <CommentsSection
              eventId={event.id}
              comments={comments}
              onUpdate={loadAll}
            />
          </div>

          {/* Recap */}
          {(event.status === "completed" || event.status === "live_event") && (
            <div className="mb-6">
              <EventRecap event={event} onUpdate={loadAll} />
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
}
