"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Event,
  EventStatus,
  EventType,
  MonthlyBudget,
  EVENT_STATUSES,
  EVENT_TYPES,
} from "@/types/database";
import type { EventBudgetPeer } from "@/lib/budgets";
import { FormActions } from "@/components/forms/form-actions";
import { FormErrorAlert } from "@/components/forms/form-error-alert";
import { Input, Textarea, Select } from "@/components/ui/input";
import { useFormSubmitState } from "@/hooks/use-form-submit-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getMonthlyBudgetsForMonth,
  budgetMonthToDbDate,
  eventDateToYearMonth,
  effectiveMonthlyCapForEvent,
  sumOthersPlannedForMonth,
} from "@/lib/budgets";
import { normalizeLocationKey } from "@/lib/location-key";
import { formatUsd } from "@/lib/format-currency";
import {
  getPlaybookMarketing,
  mergeAssetRequestsWithCatalog,
  normalizePlaybookMarketingDates,
  type PlaybookMarketing,
} from "@/lib/playbook-marketing";
import { sumPlaybookFrameworkCosts } from "@/lib/playbook-workflow";
import { AlertTriangle } from "lucide-react";
import { useCurrentOrganization } from "@/contexts/current-organization-context";

interface EventFormProps {
  event?: Partial<Event>;
  /** Managers/admins only — staff cannot edit budget fields (DB-enforced). */
  canEditBudget?: boolean;
  /** Same-calendar-month peers for planned-vs-cap check; omit to skip validation. */
  allEvents?: EventBudgetPeer[];
  /** When the event date changes, parent refetches peers for that month (edit / create flows). */
  onBudgetPeersMonthChange?: (yearMonth: string) => void;
  /** When this matches `yearMonth` from the date field, caps come from the parent (SSR / refetch) instead of a separate client query. */
  prefetchedMonthlyBudgets?: MonthlyBudget[];
  prefetchedForYearMonth?: string | null;
  /** Sum of checklist line estimated costs for this event (edit flow); included in cap math with planned budget. */
  checklistEstimatedTotalForEvent?: number;
  /** Sum of vendor agreed fees for this event; included in cap math. */
  vendorFeeTotalForEvent?: number;
  /** Org default art form link (shown as hint when editing). */
  orgMarketingArtFormUrl?: string | null;
  onSubmit: (data: {
    name: string;
    date: string;
    location: string;
    owner: string;
    status: EventStatus;
    description: string;
    onedrive_link: string;
    event_type: EventType | null;
    planned_budget: number | null;
    actual_budget: number | null;
    event_goals: string | null;
    core_activities: string | null;
    giveaway_description: string | null;
    giveaway_link: string | null;
    rsvp_incentive: string | null;
    rsvp_link: string | null;
    playbook_marketing?: PlaybookMarketing;
  }) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function EventForm({
  event,
  canEditBudget = false,
  allEvents = [],
  prefetchedMonthlyBudgets,
  prefetchedForYearMonth = null,
  checklistEstimatedTotalForEvent = 0,
  vendorFeeTotalForEvent = 0,
  onBudgetPeersMonthChange,
  onSubmit,
  onCancel,
  submitLabel = "Create Event",
  orgMarketingArtFormUrl = null,
}: EventFormProps) {
  const [name, setName] = useState(event?.name || "");
  const [date, setDate] = useState(event?.date || "");
  const [location, setLocation] = useState(event?.location || "");
  const [owner, setOwner] = useState(event?.owner || "");
  const [status, setStatus] = useState<EventStatus>(event?.status || "idea");
  const [description, setDescription] = useState(event?.description || "");
  const [onedriveLink, setOnedriveLink] = useState(event?.onedrive_link || "");
  const [eventGoals, setEventGoals] = useState(event?.event_goals || "");
  const [coreActivities, setCoreActivities] = useState(event?.core_activities || "");
  const [giveawayDescription, setGiveawayDescription] = useState(event?.giveaway_description || "");
  const [giveawayLink, setGiveawayLink] = useState(event?.giveaway_link || "");
  const [rsvpIncentive, setRsvpIncentive] = useState(event?.rsvp_incentive || "");
  const [rsvpLink, setRsvpLink] = useState(event?.rsvp_link || "");
  const [eventType, setEventType] = useState<EventType | "">(
    (event?.event_type as EventType | undefined) ?? ""
  );
  const [plannedBudget, setPlannedBudget] = useState(
    event?.planned_budget != null ? String(event.planned_budget) : ""
  );
  const [actualBudget, setActualBudget] = useState(
    event?.actual_budget != null ? String(event.actual_budget) : ""
  );
  const [playbookDraft, setPlaybookDraft] = useState<PlaybookMarketing>(() =>
    getPlaybookMarketing({
      playbook_marketing: event?.playbook_marketing ?? null,
    })
  );

  const [fetchedMonthlyBudgets, setFetchedMonthlyBudgets] = useState<
    MonthlyBudget[]
  >([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetOverrideConfirmed, setBudgetOverrideConfirmed] = useState(false);
  const skipNextBudgetMonthFetch = useRef(true);
  const { pending, error, setError, clearError, run } = useFormSubmitState();
  const { currentOrganization } = useCurrentOrganization();
  const budgetOrgId =
    event?.organization_id ?? currentOrganization?.id ?? null;

  const yearMonth =
    date.length >= 7 ? eventDateToYearMonth(date) : null;
  const locationTrimmed = location.trim();
  const locationKey = normalizeLocationKey(locationTrimmed);

  const budgetsFromParent =
    yearMonth != null &&
    prefetchedForYearMonth != null &&
    yearMonth === prefetchedForYearMonth &&
    prefetchedMonthlyBudgets !== undefined;

  const capBudgetRows = useMemo(() => {
    if (!yearMonth) return [];
    if (budgetsFromParent) return prefetchedMonthlyBudgets;
    return fetchedMonthlyBudgets;
  }, [
    yearMonth,
    budgetsFromParent,
    prefetchedMonthlyBudgets,
    fetchedMonthlyBudgets,
  ]);

  const budgetsLoadingEffective =
    Boolean(yearMonth) && !budgetsFromParent && budgetsLoading;

  useEffect(() => {
    if (!yearMonth || budgetsFromParent) return;
    if (!budgetOrgId) {
      queueMicrotask(() => setFetchedMonthlyBudgets([]));
      return;
    }
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setBudgetsLoading(true);
    });
    getMonthlyBudgetsForMonth(
      supabase,
      budgetMonthToDbDate(yearMonth),
      budgetOrgId
    )
      .then((rows) => {
        if (!cancelled) setFetchedMonthlyBudgets(rows);
      })
      .catch(() => {
        if (!cancelled) setFetchedMonthlyBudgets([]);
      })
      .finally(() => {
        if (!cancelled) setBudgetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [yearMonth, budgetsFromParent, budgetOrgId]);

  const budgetCheck = useMemo(() => {
    if (!canEditBudget || !yearMonth) {
      return {
        cap: 0,
        othersPlanned: 0,
        thisPlanned: 0,
        checklistLineSpend: 0,
        playbookFrameworkSpend: 0,
        total: 0,
        exceeds: false,
      };
    }
    const thisPlanned = numOrNull(plannedBudget) ?? 0;
    const checklistLineSpend = Math.max(0, checklistEstimatedTotalForEvent);
    const vendorFees = Math.max(0, vendorFeeTotalForEvent);
    const playbookFrameworkSpend = sumPlaybookFrameworkCosts(
      event?.playbook_workflow
    );
    const thisCommitted =
      thisPlanned +
      checklistLineSpend +
      vendorFees +
      playbookFrameworkSpend;
    const cap = effectiveMonthlyCapForEvent(capBudgetRows, locationKey);
    const singleVenueMonth = capBudgetRows.length === 1;
    const othersPlanned = sumOthersPlannedForMonth(
      allEvents,
      yearMonth,
      singleVenueMonth ? "" : locationKey,
      event?.id
    );
    const total = othersPlanned + thisCommitted;
    const exceeds = cap > 0 && total > cap;
    return {
      cap,
      othersPlanned,
      thisPlanned,
      checklistLineSpend,
      playbookFrameworkSpend,
      total,
      exceeds,
    };
  }, [
    canEditBudget,
    yearMonth,
    allEvents,
    capBudgetRows,
    locationKey,
    plannedBudget,
    checklistEstimatedTotalForEvent,
    vendorFeeTotalForEvent,
    event?.id,
    event?.playbook_workflow,
  ]);

  useEffect(() => {
    void Promise.resolve().then(() => setBudgetOverrideConfirmed(false));
  }, [date, location, plannedBudget, yearMonth, checklistEstimatedTotalForEvent, vendorFeeTotalForEvent]);

  useEffect(() => {
    if (!canEditBudget || !onBudgetPeersMonthChange) return;
    if (skipNextBudgetMonthFetch.current) {
      skipNextBudgetMonthFetch.current = false;
      return;
    }
    const ym = date.length >= 7 ? eventDateToYearMonth(date) : null;
    if (!ym) return;
    const t = setTimeout(() => onBudgetPeersMonthChange(ym), 300);
    return () => clearTimeout(t);
  }, [date, canEditBudget, onBudgetPeersMonthChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (!name.trim() || !date) {
      setError("Name and date are required");
      return;
    }
    if (
      canEditBudget &&
      budgetCheck.exceeds &&
      !budgetOverrideConfirmed
    ) {
      setError(
        "Planned budgets exceed the monthly cap. Confirm the override below or reduce the planned amount."
      );
      return;
    }
    await run(() => {
      const basePayload = {
        name: name.trim(),
        date,
        location: location.trim(),
        owner: owner.trim(),
        status,
        description: description.trim(),
        onedrive_link: onedriveLink.trim() || "",
        event_type: eventType === "" ? null : eventType,
        planned_budget: canEditBudget
          ? numOrNull(plannedBudget)
          : (event?.planned_budget ?? null),
        actual_budget: canEditBudget
          ? numOrNull(actualBudget)
          : (event?.actual_budget ?? null),
        event_goals: eventGoals.trim() || null,
        core_activities: coreActivities.trim() || null,
        giveaway_description: giveawayDescription.trim() || null,
        giveaway_link: giveawayLink.trim() || null,
        rsvp_incentive: rsvpIncentive.trim() || null,
        rsvp_link: rsvpLink.trim() || null,
      };
      return onSubmit(
        event?.id
          ? {
              ...basePayload,
              playbook_marketing: normalizePlaybookMarketingDates({
                ...getPlaybookMarketing({
                  playbook_marketing: event.playbook_marketing ?? null,
                }),
                ...playbookDraft,
                asset_requests: mergeAssetRequestsWithCatalog(
                  playbookDraft.asset_requests
                ),
              }),
            }
          : basePayload
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Event Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Summer Kickoff Ride"
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Date *"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Milwaukee, WI"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="e.g. John Smith"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as EventStatus)}
          options={EVENT_STATUSES}
        />
      </div>

      <Select
        label="Event type (for analytics)"
        value={eventType}
        onChange={(e) =>
          setEventType((e.target.value || "") as EventType | "")
        }
        options={[
          { value: "", label: "Not set" },
          ...EVENT_TYPES,
        ]}
      />

      <Textarea
        label="Event Purpose & Goals"
        value={eventGoals}
        onChange={(e) => setEventGoals(e.target.value)}
        placeholder="e.g. Drive dealership traffic, increase sales in MotorClothes & Parts, GOAL: 35 QR Scans"
        rows={3}
      />

      <Textarea
        label="Core Activities"
        value={coreActivities}
        onChange={(e) => setCoreActivities(e.target.value)}
        placeholder="e.g. Food & Refreshments, Entertainment (DJ/live band), Bike wash & test rides, Raffles & giveaways"
        rows={3}
      />

      <div className="space-y-3 p-4 rounded-lg border border-harley-gray/30 bg-harley-gray-light/5">
        <p className="text-xs font-semibold text-harley-text-muted uppercase tracking-wide">
          Promotions
        </p>
        <Textarea
          label="Giveaway"
          value={giveawayDescription}
          onChange={(e) => setGiveawayDescription(e.target.value)}
          placeholder='e.g. Win a $500 gift card — enter via QR code at the event'
          rows={2}
        />
        <Input
          label="Giveaway / QR Link"
          type="url"
          value={giveawayLink}
          onChange={(e) => setGiveawayLink(e.target.value)}
          placeholder="https://mixer.com/..."
        />
        <Textarea
          label="RSVP Incentive"
          value={rsvpIncentive}
          onChange={(e) => setRsvpIncentive(e.target.value)}
          placeholder='e.g. First 30 to RSVP get a free food ticket'
          rows={2}
        />
        <Input
          label="RSVP Link"
          type="url"
          value={rsvpLink}
          onChange={(e) => setRsvpLink(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {event?.id ? (
        <div className="space-y-3 p-4 rounded-lg border border-harley-gray/30 bg-harley-gray-light/5">
          <p className="text-xs font-semibold text-harley-text-muted uppercase tracking-wide">
            Marketing & publishing (playbook)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Engagement goal label"
              value={playbookDraft.engagement_goal_label ?? ""}
              onChange={(e) =>
                setPlaybookDraft((d) => ({
                  ...d,
                  engagement_goal_label: e.target.value || null,
                }))
              }
              placeholder='e.g. "QR scans"'
            />
            <Input
              label="Engagement goal target #"
              type="number"
              min={0}
              value={
                playbookDraft.engagement_goal_target != null
                  ? String(playbookDraft.engagement_goal_target)
                  : ""
              }
              onChange={(e) => {
                const t = e.target.value.trim();
                setPlaybookDraft((d) => ({
                  ...d,
                  engagement_goal_target:
                    t === "" ? null : Math.max(0, parseInt(t, 10) || 0),
                }));
              }}
              placeholder="e.g. 35"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Art request sent"
              type="date"
              value={
                playbookDraft.art_request_sent_at &&
                /^\d{4}-\d{2}-\d{2}$/.test(playbookDraft.art_request_sent_at)
                  ? playbookDraft.art_request_sent_at
                  : ""
              }
              onChange={(e) =>
                setPlaybookDraft((d) => ({
                  ...d,
                  art_request_sent_at: e.target.value || null,
                }))
              }
            />
            <Input
              label="Art finals received"
              type="date"
              value={
                playbookDraft.art_finals_received_at &&
                /^\d{4}-\d{2}-\d{2}$/.test(
                  playbookDraft.art_finals_received_at
                )
                  ? playbookDraft.art_finals_received_at
                  : ""
              }
              onChange={(e) =>
                setPlaybookDraft((d) => ({
                  ...d,
                  art_finals_received_at: e.target.value || null,
                }))
              }
            />
            <Input
              label="PAM map approval"
              type="date"
              value={
                playbookDraft.pam_map_approval_at &&
                /^\d{4}-\d{2}-\d{2}$/.test(playbookDraft.pam_map_approval_at)
                  ? playbookDraft.pam_map_approval_at
                  : ""
              }
              onChange={(e) =>
                setPlaybookDraft((d) => ({
                  ...d,
                  pam_map_approval_at: e.target.value || null,
                }))
              }
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
              <input
                type="checkbox"
                checked={playbookDraft.canva_web_banner_done ?? false}
                onChange={(e) =>
                  setPlaybookDraft((d) => ({
                    ...d,
                    canva_web_banner_done: e.target.checked,
                  }))
                }
                className="rounded border-harley-gray-lighter"
              />
              Canva web banner done
            </label>
            <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
              <input
                type="checkbox"
                checked={playbookDraft.canva_fb_cover_done ?? false}
                onChange={(e) =>
                  setPlaybookDraft((d) => ({
                    ...d,
                    canva_fb_cover_done: e.target.checked,
                  }))
                }
                className="rounded border-harley-gray-lighter"
              />
              Canva Facebook cover done
            </label>
          </div>
          <Input
            label="Per-event art request form URL"
            type="url"
            value={playbookDraft.art_request_form_url ?? ""}
            onChange={(e) =>
              setPlaybookDraft((d) => ({
                ...d,
                art_request_form_url: e.target.value.trim()
                  ? e.target.value
                  : null,
              }))
            }
            placeholder="https://…"
          />
          {orgMarketingArtFormUrl ? (
            <p className="text-[11px] text-harley-text-muted">
              Org default:{" "}
              <span className="text-harley-text break-all">
                {orgMarketingArtFormUrl}
              </span>
            </p>
          ) : null}
          <Textarea
            label="Web summary"
            value={playbookDraft.web_summary ?? ""}
            onChange={(e) =>
              setPlaybookDraft((d) => ({
                ...d,
                web_summary: e.target.value || null,
              }))
            }
            rows={2}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SEO meta title"
              value={playbookDraft.seo_meta_title ?? ""}
              onChange={(e) =>
                setPlaybookDraft((d) => ({
                  ...d,
                  seo_meta_title: e.target.value || null,
                }))
              }
            />
            <Input
              label="Public page URL"
              type="url"
              value={playbookDraft.web_page_url ?? ""}
              onChange={(e) =>
                setPlaybookDraft((d) => ({
                  ...d,
                  web_page_url: e.target.value || null,
                }))
              }
            />
          </div>
          <Textarea
            label="SEO meta description"
            value={playbookDraft.seo_meta_description ?? ""}
            onChange={(e) =>
              setPlaybookDraft((d) => ({
                ...d,
                seo_meta_description: e.target.value || null,
              }))
            }
            rows={2}
          />
          <Textarea
            label="Facebook event copy"
            value={playbookDraft.facebook_event_copy ?? ""}
            onChange={(e) =>
              setPlaybookDraft((d) => ({
                ...d,
                facebook_event_copy: e.target.value || null,
              }))
            }
            rows={3}
          />
        </div>
      ) : null}

      {canEditBudget && (
        <div className="space-y-3 p-4 rounded-lg border border-harley-orange/25 bg-harley-orange/5">
          <p className="text-xs text-harley-text-muted">
            Budget (managers only)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Planned budget ($)"
              type="number"
              min={0}
              step={0.01}
              value={plannedBudget}
              onChange={(e) => setPlannedBudget(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Actual budget ($, optional)"
              type="number"
              min={0}
              step={0.01}
              value={actualBudget}
              onChange={(e) => setActualBudget(e.target.value)}
              placeholder="After event"
            />
          </div>
              {yearMonth && (
            <p className="text-[11px] text-harley-text-muted">
              {budgetsLoadingEffective
                ? "Loading monthly cap…"
                : budgetCheck.cap > 0
                  ? `Monthly cap for ${yearMonth}${locationTrimmed ? ` · ${locationTrimmed}` : " (all locations combined)"}: ${formatUsd(budgetCheck.cap)} · Other events this month: ${formatUsd(budgetCheck.othersPlanned)}${budgetCheck.checklistLineSpend > 0 ? ` · Checklist estimates (this event): ${formatUsd(budgetCheck.checklistLineSpend)}` : ""}${budgetCheck.playbookFrameworkSpend > 0 ? ` · Playbook activity costs (this event): ${formatUsd(budgetCheck.playbookFrameworkSpend)}` : ""}`
                  : `No monthly cap set for ${yearMonth}${locationTrimmed ? ` at "${locationTrimmed}"` : ""}. Add caps on the Budget page if you want warnings.`}
            </p>
          )}
          {budgetCheck.exceeds && (
            <div className="rounded-lg border border-harley-warning/50 bg-harley-warning/10 p-3 space-y-3">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-harley-warning shrink-0 mt-0.5" />
                  <div className="text-sm text-harley-text">
                    <p className="font-medium text-harley-warning">
                      Planned total would exceed the monthly budget
                    </p>
                    <p className="text-harley-text-muted mt-1 leading-relaxed">
                      With this event, committed spend for{" "}
                      <strong>{yearMonth}</strong>
                      {locationTrimmed
                        ? <> at <strong>{locationTrimmed}</strong></>
                        : <> (all locations)</>}{" "}
                      would be{" "}
                      <strong>{formatUsd(budgetCheck.total)}</strong>
                      {budgetCheck.checklistLineSpend > 0 ||
                      budgetCheck.playbookFrameworkSpend > 0 ? (
                        <>
                          {" "}
                          (including
                          {budgetCheck.checklistLineSpend > 0 ? (
                            <>
                              {" "}
                              {formatUsd(budgetCheck.checklistLineSpend)} from
                              checklist line items
                            </>
                          ) : null}
                          {budgetCheck.checklistLineSpend > 0 &&
                          budgetCheck.playbookFrameworkSpend > 0
                            ? " and "
                            : null}
                          {budgetCheck.playbookFrameworkSpend > 0 ? (
                            <>
                              {formatUsd(budgetCheck.playbookFrameworkSpend)}{" "}
                              from playbook activity lines
                            </>
                          ) : null}
                          )
                        </>
                      ) : null}
                      , over the cap of{" "}
                      <strong>{formatUsd(budgetCheck.cap)}</strong> (
                      {formatUsd(budgetCheck.total - budgetCheck.cap)}{" "}
                      over).
                    </p>
                    <p className="text-xs text-harley-text-muted mt-2">
                      You can still save — check the box below to confirm you
                      want to override the cap.
                    </p>
                  </div>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer text-sm text-harley-text">
                  <input
                    type="checkbox"
                    checked={budgetOverrideConfirmed}
                    onChange={(e) => {
                      setBudgetOverrideConfirmed(e.target.checked);
                      if (e.target.checked) clearError();
                    }}
                    className="mt-1 rounded border-harley-gray-lighter"
                  />
                  <span>
                    I understand this exceeds the monthly budget and want to
                    save anyway.
                  </span>
                </label>
            </div>
          )}
        </div>
      )}

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's this event about?"
        rows={3}
      />

      <Input
        label="OneDrive Link (optional)"
        type="url"
        value={onedriveLink}
        onChange={(e) => setOnedriveLink(e.target.value)}
        placeholder="https://onedrive.live.com/..."
      />

      <FormErrorAlert message={error} />

      <FormActions
        pending={pending}
        submitLabel={submitLabel}
        onCancel={onCancel}
        order="submit-first"
      />
    </form>
  );
}
