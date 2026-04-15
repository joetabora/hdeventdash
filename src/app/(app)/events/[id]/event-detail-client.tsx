"use client";

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
import {
  Event,
  ChecklistItem,
  EventDocument,
  EventComment,
  EventMedia,
  EventVendorWithVendor,
  MonthlyBudget,
  SwapMeetSpot,
} from "@/types/database";
import type { EventBudgetPeer } from "@/lib/budgets";
import { useEventController } from "@/hooks/use-event-controller";
import { SwapMeetSection } from "@/components/events/swap-meet-section";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  DollarSign,
  Plus,
  Sparkles,
  Store,
  X,
} from "lucide-react";

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
};

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
}: EventDetailClientProps) {
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

  return (
    <>
      <div className="max-w-5xl pb-28 md:pb-0">
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
        />

        <EventDetailChecklist
          mode="standard"
          eventId={c.event.id}
          checklist={c.checklist}
          canManageEvents={c.canManageEvents}
          onChecklistInvalidate={c.onChecklistInvalidate}
          onOptimisticPatch={c.localPatch.checklistItem}
          onBudgetContextInvalidate={c.onBudgetContextInvalidate}
        />

        <EventDetailVendors
          eventId={c.event.id}
          eventVendors={c.eventVendors}
          canMutate={c.canManageEvents}
          onEventVendorsInvalidate={() => void c.refetch.eventVendors()}
          onOptimisticPatch={c.localPatch.eventVendor}
          onOptimisticRemove={c.localPatch.removeEventVendor}
        />

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

        {(c.event.status === "completed" || c.event.status === "live_event") && (
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

      {c.canManageEvents && (
        <Modal
          isOpen={c.editModalOpen}
          onClose={() => c.setEditModalOpen(false)}
          title="Edit Event"
          size="lg"
        >
          <EventForm
            event={c.event}
            canEditBudget={c.canManageEvents}
            allEvents={c.budgetPeers}
            prefetchedMonthlyBudgets={c.monthlyBudgetsForEventMonth}
            prefetchedForYearMonth={c.eventMonthYearMonth}
            checklistEstimatedTotalForEvent={c.checklistEstimatedTotal}
            onBudgetPeersMonthChange={c.onBudgetPeersMonthChange}
            onSubmit={c.handleEditSubmit}
            onCancel={() => c.setEditModalOpen(false)}
            submitLabel="Save Changes"
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
