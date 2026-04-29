"use client";

import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { EventForm } from "@/components/events/event-form";
import { EventRecap } from "@/components/events/event-recap";
import {
  DynamicAiAssistant,
  DynamicEventRoiSection,
} from "@/components/events/event-detail/lazy-event-detail-components";
import { EventMobileActionBar } from "@/components/events/event-mobile-action-bar";
import { CollapsibleSection } from "@/components/events/event-detail/collapsible-section";
import { EventCommentsModule } from "@/components/events/event-detail/event-comments-module";
import { EventDetailHeader } from "@/components/events/event-detail/event-detail-header";
import { EventDetailChecklist } from "@/components/events/event-detail/event-detail-checklist";
import { EventDetailMedia } from "@/components/events/event-detail/event-detail-media";
import { EventDetailVendors } from "@/components/events/event-detail/event-detail-vendors";
import { EventMarketingPublishingSection } from "@/components/events/event-detail/event-marketing-publishing-section";
import { PlaybookPhaseNav } from "@/components/events/event-detail/playbook-phase-nav";
import {
  Event,
  ChecklistItem,
  EventDocument,
  EventComment,
  EventMedia,
  EventVendorWithVendor,
  MonthlyBudget,
  SwapMeetSpot,
  EVENT_TYPES,
} from "@/types/database";
import type { EventBudgetPeer } from "@/lib/budgets";
import { useEventController } from "@/hooks/use-event-controller";
import { SwapMeetSection } from "@/components/events/swap-meet-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  DollarSign,
  Info,
  Plus,
  Printer,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import {
  PLAYBOOK_AFTER_SECTIONS,
  PLAYBOOK_PREPARE_SECTIONS,
  PLAYBOOK_WEEK_SECTIONS,
  type PlaybookPhaseId,
} from "@/lib/playbook-phases";

export type EventDetailClientProps = {
  eventId: string;
  initialEvent: Event;
  initialChecklist: ChecklistItem[];
  initialDocuments: EventDocument[];
  initialComments: EventComment[];
  initialMedia: EventMedia[];
  initialEventVendors: EventVendorWithVendor[];
  initialBudgetPeers: EventBudgetPeer[];
  initialMonthlyBudgetsForEventMonth: MonthlyBudget[];
  initialSwapMeetSpots: SwapMeetSpot[];
  /** Org default SPM / art form URL (optional). */
  initialOrgMarketingArtFormUrl?: string | null;
};

function phaseContentClass(active: PlaybookPhaseId, panel: PlaybookPhaseId) {
  return active === panel ? "space-y-4" : "hidden print:block space-y-4";
}

export function EventDetailClient({
  eventId,
  initialEvent,
  initialChecklist,
  initialDocuments,
  initialComments,
  initialMedia,
  initialEventVendors,
  initialBudgetPeers,
  initialMonthlyBudgetsForEventMonth,
  initialSwapMeetSpots,
  initialOrgMarketingArtFormUrl = null,
}: EventDetailClientProps) {
  const [playbookPhase, setPlaybookPhase] = useState<PlaybookPhaseId>("define");
  const orgMarketingArtFormUrl = initialOrgMarketingArtFormUrl ?? null;

  const c = useEventController(eventId, {
    event: initialEvent,
    checklist: initialChecklist,
    documents: initialDocuments,
    comments: initialComments,
    media: initialMedia,
    eventVendors: initialEventVendors,
    budgetPeers: initialBudgetPeers,
    monthlyBudgetsForEventMonth: initialMonthlyBudgetsForEventMonth,
    swapMeetSpots: initialSwapMeetSpots,
  });

  const goToSupportingAi = useCallback(() => {
    setPlaybookPhase("supporting");
    requestAnimationFrame(() => {
      document
        .getElementById("playbook-ai-assistant")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  if (!c.event) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-harley-text-muted">Event not found</p>
      </div>
    );
  }

  if (c.isLiveMode) {
    return (
      <>
        <div className="w-full max-w-2xl mx-auto pb-28 md:pb-8 safe-bottom space-y-5 sm:space-y-6">
          <EventDetailHeader
            mode="live"
            event={c.event}
            canManageEvents={c.canManageEvents}
            onExitLiveMode={c.handleToggleLiveMode}
            onMarkLiveEvent={() => c.handleStatusChange("live_event")}
          />
          <EventDetailChecklist
            mode="live"
            eventId={c.event.id}
            checklist={c.checklist}
            canManageEvents={c.canManageEvents}
            onChecklistInvalidate={c.onChecklistInvalidate}
            onOptimisticPatch={c.localPatch.checklistItem}
            onBudgetContextInvalidate={c.onBudgetContextInvalidate}
            atRisk={c.atRisk}
            allChecklistComplete={c.allChecklistComplete}
          />
        </div>
        <EventMobileActionBar
          eventId={c.event.id}
          checklist={c.checklist}
          onAfterChecklistChange={c.onChecklistInvalidate}
          onAfterMediaChange={() => void c.refetch.media()}
          onAfterCommentChange={() => void c.refetch.comments()}
          canManageExtras={c.canManageEvents}
        />
      </>
    );
  }

  const playbookNav = (
    <PlaybookPhaseNav
      activePhase={playbookPhase}
      onPhaseChange={setPlaybookPhase}
    />
  );

  const eventTypeLabel = c.event.event_type
    ? EVENT_TYPES.find((t) => t.value === c.event!.event_type)?.label ??
      c.event.event_type
    : null;

  return (
    <>
      <div
        id="event-playbook-root"
        className="print-playbook-root max-w-5xl pb-28 md:pb-0"
      >
        <EventDetailHeader
          mode="standard"
          event={c.event}
          canManageEvents={c.canManageEvents}
          isAdmin={c.isAdmin}
          atRisk={c.atRisk}
          allChecklistComplete={c.allChecklistComplete}
          completedCount={c.completedCount}
          totalCount={c.totalCount}
          percentage={c.percentage}
          showStatusPills={c.showStatusPills}
          setShowStatusPills={c.setShowStatusPills}
          onToggleLiveMode={c.handleToggleLiveMode}
          onOpenEdit={() => c.setEditModalOpen(true)}
          onDelete={c.handleDelete}
          onStatusChange={c.handleStatusChange}
          budgetSummaryForEventMonth={c.budgetSummaryForEventMonth}
          playbookPhaseNav={playbookNav}
        />

        <div className="flex justify-end print:hidden mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            Print playbook view
          </Button>
        </div>

        <div className="mt-5 sm:mt-6 space-y-8 print:space-y-6">
          <div className={phaseContentClass(playbookPhase, "define")}>
            <CollapsibleSection
              icon={<Info className="w-4.5 h-4.5" />}
              title="Define"
              defaultOpen={true}
            >
              <div className="space-y-4 text-sm text-harley-text-muted leading-relaxed">
                {eventTypeLabel ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide font-semibold mb-1.5">
                      Event type
                    </p>
                    <Badge variant="default" className="text-xs font-normal">
                      {eventTypeLabel}
                    </Badge>
                  </div>
                ) : null}
                <p>
                  Purpose, core activities, and promotions are summarized in the
                  card below the title. Use{" "}
                  <span className="text-harley-text font-medium">Edit</span> to
                  change them, or open another playbook phase to continue setup.
                </p>
              </div>
            </CollapsibleSection>

            {c.event.has_swap_meet ? (
              <CollapsibleSection
                key={`swap-meet-${c.event.id}`}
                icon={<Store className="w-4.5 h-4.5" />}
                title="Swap Meet Spots"
                count={c.swapMeetSpots.length}
                autoOpenOnDesktop
                mobileCollapsed
                headerAction={
                  c.canManageEvents ? (
                    <button
                      type="button"
                      className="text-harley-text-muted hover:text-harley-danger transition-colors p-1 -m-1"
                      title="Remove Swap Meet section"
                      onClick={() => void c.handleToggleSwapMeet(false)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : undefined
                }
              >
                <SwapMeetSection
                  eventId={c.event.id}
                  spots={c.swapMeetSpots}
                  canMutate={c.canManageEvents}
                  onUpdate={() => void c.refetch.swapMeetSpots()}
                  onOptimisticPatch={c.localPatch.swapMeetSpot}
                  onOptimisticAdd={c.localPatch.addSwapMeetSpot}
                  onOptimisticRemove={c.localPatch.removeSwapMeetSpot}
                />
              </CollapsibleSection>
            ) : c.canManageEvents ? (
              <div className="flex justify-center py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-harley-text-muted hover:text-harley-orange"
                  onClick={() => void c.handleToggleSwapMeet(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add Swap Meet
                </Button>
              </div>
            ) : null}
          </div>

          <div className={phaseContentClass(playbookPhase, "prepare")}>
            <CollapsibleSection
              icon={<Info className="w-4.5 h-4.5" />}
              title="Prepare"
              defaultOpen={true}
            >
              <p className="text-xs text-harley-text-muted mb-3 leading-relaxed">
                Pre-event preparation and day-of materials checklist (from your
                Event Playbook).
              </p>
              <EventDetailChecklist
                mode="standard"
                eventId={c.event.id}
                checklist={c.checklist}
                canManageEvents={c.canManageEvents}
                onChecklistInvalidate={c.onChecklistInvalidate}
                onOptimisticPatch={c.localPatch.checklistItem}
                onBudgetContextInvalidate={c.onBudgetContextInvalidate}
                sectionsFilter={PLAYBOOK_PREPARE_SECTIONS}
                embedded
              />
            </CollapsibleSection>
          </div>

          <div className={phaseContentClass(playbookPhase, "market")}>
            <EventMarketingPublishingSection
              event={c.event}
              orgMarketingArtFormUrl={orgMarketingArtFormUrl}
              canEdit={c.canManageEvents}
              onAfterSave={c.setEvent}
              onGoToSupporting={goToSupportingAi}
            />
          </div>

          <div className={phaseContentClass(playbookPhase, "week")}>
            <CollapsibleSection
              icon={<Info className="w-4.5 h-4.5" />}
              title="Week & day-of"
              defaultOpen={true}
            >
              <EventDetailChecklist
                mode="standard"
                eventId={c.event.id}
                checklist={c.checklist}
                canManageEvents={c.canManageEvents}
                onChecklistInvalidate={c.onChecklistInvalidate}
                onOptimisticPatch={c.localPatch.checklistItem}
                onBudgetContextInvalidate={c.onBudgetContextInvalidate}
                sectionsFilter={PLAYBOOK_WEEK_SECTIONS}
                embedded
              />
            </CollapsibleSection>
          </div>

          <div className={phaseContentClass(playbookPhase, "after")}>
            <CollapsibleSection
              icon={<Info className="w-4.5 h-4.5" />}
              title="After"
              defaultOpen={true}
            >
              <p className="text-xs text-harley-text-muted mb-3 leading-relaxed">
                Post-event follow-up, roles, and success metrics. Cross-check
                numbers in ROI when you close the loop.
              </p>
              <EventDetailChecklist
                mode="standard"
                eventId={c.event.id}
                checklist={c.checklist}
                canManageEvents={c.canManageEvents}
                onChecklistInvalidate={c.onChecklistInvalidate}
                onOptimisticPatch={c.localPatch.checklistItem}
                onBudgetContextInvalidate={c.onBudgetContextInvalidate}
                sectionsFilter={PLAYBOOK_AFTER_SECTIONS}
                embedded
              />
            </CollapsibleSection>
          </div>

          <div className={phaseContentClass(playbookPhase, "supporting")}>
            <EventDetailVendors
              eventId={c.event.id}
              eventVendors={c.eventVendors}
              canMutate={c.canManageEvents}
              onEventVendorsInvalidate={() => void c.refetch.eventVendors()}
              onOptimisticPatch={c.localPatch.eventVendor}
              onOptimisticRemove={c.localPatch.removeEventVendor}
            />

            <EventDetailMedia
              eventId={c.event.id}
              media={c.media}
              documents={c.documents}
              canMutate={c.canManageEvents}
              onMediaInvalidate={() => void c.refetch.media()}
              onDocumentsInvalidate={() => void c.refetch.documents()}
            />

            <CollapsibleSection
              key={`roi-${c.event.id}`}
              icon={<DollarSign className="w-4.5 h-4.5" />}
              title="ROI & Metrics"
              autoOpenOnDesktop
              mobileCollapsed
              deferHeavyContent
            >
              <DynamicEventRoiSection
                event={c.event}
                onUpdate={() => void c.refetch.event()}
                canEdit={c.canManageEvents}
              />
            </CollapsibleSection>

            {(c.event.status === "completed" ||
              c.event.status === "live_event") && (
              <CollapsibleSection
                icon={<BarChart3 className="w-4.5 h-4.5" />}
                title="Event Recap"
                autoOpenOnDesktop
                mobileCollapsed
              >
                <EventRecap
                  event={c.event}
                  onUpdate={() => void c.refetch.event()}
                  canEdit={c.canManageEvents}
                />
              </CollapsibleSection>
            )}

            <EventCommentsModule
              eventId={c.event.id}
              comments={c.comments}
              canManageEvents={c.canManageEvents}
              onCommentsInvalidate={() => void c.refetch.comments()}
            />

            <CollapsibleSection
              id="playbook-ai-assistant"
              key={`ai-${c.event.id}`}
              icon={<Sparkles className="w-4.5 h-4.5" />}
              title="AI Assistant"
              autoOpenOnDesktop
              mobileCollapsed
              deferHeavyContent
            >
              <DynamicAiAssistant event={c.event} />
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {c.canManageEvents && (
        <Modal
          isOpen={c.editModalOpen}
          onClose={() => c.setEditModalOpen(false)}
          title="Edit Event"
          size="lg"
        >
          <EventForm
            key={`${c.event.id}-${c.event.updated_at}`}
            event={c.event}
            canEditBudget={c.canManageEvents}
            allEvents={c.budgetPeers}
            prefetchedMonthlyBudgets={c.monthlyBudgetsForEventMonth}
            prefetchedForYearMonth={c.eventMonthYearMonth}
            checklistEstimatedTotalForEvent={c.checklistEstimatedTotal}
            vendorFeeTotalForEvent={c.vendorFeeTotal}
            onBudgetPeersMonthChange={c.onBudgetPeersMonthChange}
            onSubmit={c.handleEditSubmit}
            onCancel={() => c.setEditModalOpen(false)}
            submitLabel="Save Changes"
            orgMarketingArtFormUrl={orgMarketingArtFormUrl}
          />
        </Modal>
      )}

      <EventMobileActionBar
        eventId={c.event.id}
        checklist={c.checklist}
        onAfterChecklistChange={c.onChecklistInvalidate}
        onAfterMediaChange={() => void c.refetch.media()}
        onAfterCommentChange={() => void c.refetch.comments()}
        canManageExtras={c.canManageEvents}
      />
    </>
  );
}
