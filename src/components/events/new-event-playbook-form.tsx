"use client";

import { useEffect, useMemo, useState } from "react";
import type { EventBudgetPeer } from "@/lib/budgets";
import {
  effectiveMonthlyCapForEvent,
  sumOthersPlannedForMonth,
} from "@/lib/budgets";
import { normalizeLocationKey } from "@/lib/location-key";
import {
  eventDateToYearMonth,
  getMonthlyBudgetsForMonth,
  budgetMonthToDbDate,
} from "@/lib/budgets";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createSignedEventDocumentUrl } from "@/lib/events";
import { formatUsd } from "@/lib/format-currency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FormErrorAlert } from "@/components/forms/form-error-alert";
import { FormActions } from "@/components/forms/form-actions";
import { useFormSubmitState } from "@/hooks/use-form-submit-state";
import { useCurrentOrganization } from "@/contexts/current-organization-context";
import type {
  Event,
  EventMedia,
  EventStatus,
  EventType,
  MonthlyBudget,
} from "@/types/database";
import { EVENT_TYPES } from "@/types/database";
import {
  defaultPlaybookMarketing,
  effectiveArtRequestFormUrl,
  getPlaybookMarketing,
  mergeAssetRequestsWithCatalog,
  normalizePlaybookMarketingDates,
  PLAYBOOK_MARKETING_ASSET_CATALOG,
  type PlaybookMarketing,
} from "@/lib/playbook-marketing";
import {
  type PlaybookFrameworkLineItem,
  type PlaybookWorkflow,
  defaultEmptyPlaybookWorkflow,
  getPlaybookWorkflow,
  sumPlaybookFrameworkCosts,
} from "@/lib/playbook-workflow";
import {
  AI_PROMPT_1_FIXED,
  AI_PROMPT_2_FIXED,
  AI_PROMPT_3_FIXED,
  buildCopyDevelopmentPrompt1,
  EVENT_TO_FACEBOOK_LINES,
  EVENT_TO_WEBSITE_LINES,
  EVENT_WEEK_FLOW_COPY,
  INTERNAL_COMMUNICATION_LINES,
  METRICS_FOR_SUCCESS_LINES,
  NEW_EVENT_DEFAULT_QR_GOAL,
  NEW_EVENT_PURPOSE_LINES,
  POST_EVENT_FOLLOW_UP_COPY,
  SPM_ART_REQUEST_FORM_URL,
} from "@/lib/new-event-playbook-copy";
import type { CreateEventApiBody } from "@/lib/events-api-client";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";

export type NewEventPlaybookSubmitPayload = {
  body: CreateEventApiBody;
  webGraphicFile: File | null;
  pageBannerFile: File | null;
};

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function playbookFormStateFromEvent(
  event: Event,
  orgMarketingArtFormUrl: string | null | undefined
) {
  const wf = getPlaybookWorkflow(event);
  const pm = getPlaybookMarketing(event);
  const artUrl =
    effectiveArtRequestFormUrl(event, orgMarketingArtFormUrl ?? null) ??
    SPM_ART_REQUEST_FORM_URL;

  return {
    place: event.location ?? "",
    title: event.name ?? "",
    date: event.date ?? "",
    timeStart: event.event_time_start ?? "",
    timeEnd: event.event_time_end ?? "",
    coreActivities:
      event.core_activities?.trim() || event.description?.trim() || "",
    owner: event.owner ?? "",
    eventType: (event.event_type ?? "") as EventType | "",
    plannedBudget:
      event.planned_budget != null &&
      Number.isFinite(Number(event.planned_budget))
        ? String(event.planned_budget)
        : "",
    workflow: wf,
    marketing: {
      ...pm,
      art_request_form_url: artUrl,
      engagement_goal_label: pm.engagement_goal_label?.trim()
        ? pm.engagement_goal_label
        : "QR scans",
      engagement_goal_target:
        pm.engagement_goal_target != null &&
        Number.isFinite(pm.engagement_goal_target)
          ? pm.engagement_goal_target
          : 35,
    },
  };
}

function StaticInfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="lg" className="border-harley-gray/60 bg-harley-black/30">
      <h2 className="text-sm font-semibold text-harley-orange uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div className="text-sm text-harley-text-muted leading-relaxed space-y-2">
        {children}
      </div>
    </Card>
  );
}

function LineItemBucket({
  title,
  hint,
  items,
  onChange,
}: {
  title: string;
  hint: string;
  items: PlaybookFrameworkLineItem[];
  onChange: (next: PlaybookFrameworkLineItem[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-harley-text">{title}</h3>
        <p className="text-xs text-harley-text-muted mt-0.5">{hint}</p>
      </div>
      <div className="space-y-3">
        {items.map((row, i) => (
          <div
            key={i}
            className="rounded-lg border border-harley-gray/40 p-3 space-y-2 bg-harley-black/20"
          >
            <div className="flex justify-between gap-2">
              <span className="text-xs text-harley-text-muted">Item {i + 1}</span>
              <button
                type="button"
                className="text-harley-text-muted hover:text-harley-danger p-1"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label="Remove row"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Input
              label="Name / vendor / entertainer"
              value={row.name ?? ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...row, name: e.target.value || null };
                onChange(next);
              }}
              placeholder="e.g. ABC Catering"
            />
            <Textarea
              label="Description"
              value={row.description ?? ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...row, description: e.target.value || null };
                onChange(next);
              }}
              rows={2}
            />
            <Input
              label="Estimated cost ($)"
              type="number"
              min={0}
              step={0.01}
              value={row.cost != null ? String(row.cost) : ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = {
                  ...row,
                  cost: numOrNull(e.target.value) ?? null,
                };
                onChange(next);
              }}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-1"
        onClick={() =>
          onChange([
            ...items,
            { name: "", description: "", cost: null },
          ])
        }
      >
        <Plus className="w-4 h-4" />
        Add line
      </Button>
    </div>
  );
}

export type NewEventPlaybookFormProps = {
  allEvents: EventBudgetPeer[];
  prefetchedMonthlyBudgets?: MonthlyBudget[];
  prefetchedForYearMonth?: string | null;
  onBudgetPeersMonthChange?: (yearMonth: string) => void;
  onSubmit: (payload: NewEventPlaybookSubmitPayload) => Promise<void>;
  onCancel?: () => void;
  /** When set, the form initializes from this row and monthly-cap peer math excludes it. */
  editSourceEvent?: Event;
  /** When editing an event, pass current media so web graphic / banner previews resolve. */
  eventMedia?: EventMedia[];
  orgMarketingArtFormUrl?: string | null;
};

export function NewEventPlaybookForm({
  allEvents,
  prefetchedMonthlyBudgets,
  prefetchedForYearMonth,
  onBudgetPeersMonthChange,
  onSubmit,
  onCancel,
  editSourceEvent,
  eventMedia = [],
  orgMarketingArtFormUrl = null,
}: NewEventPlaybookFormProps) {
  const isEdit = Boolean(editSourceEvent);
  const { currentOrganization } = useCurrentOrganization();
  const budgetOrgId =
    editSourceEvent?.organization_id ?? currentOrganization?.id ?? null;
  const boot =
    editSourceEvent != null
      ? playbookFormStateFromEvent(editSourceEvent, orgMarketingArtFormUrl)
      : null;

  const [place, setPlace] = useState(() => boot?.place ?? "");
  const [title, setTitle] = useState(() => boot?.title ?? "");
  const [date, setDate] = useState(() => boot?.date ?? "");
  const [timeStart, setTimeStart] = useState(() => boot?.timeStart ?? "");
  const [timeEnd, setTimeEnd] = useState(() => boot?.timeEnd ?? "");
  const [coreActivities, setCoreActivities] = useState(
    () => boot?.coreActivities ?? ""
  );
  const [owner, setOwner] = useState(() => boot?.owner ?? "");
  const [eventType, setEventType] = useState<EventType | "">(
    () => boot?.eventType ?? ""
  );
  const [plannedBudget, setPlannedBudget] = useState(
    () => boot?.plannedBudget ?? ""
  );
  const [workflow, setWorkflow] = useState<PlaybookWorkflow>(
    () => boot?.workflow ?? defaultEmptyPlaybookWorkflow()
  );
  const [marketing, setMarketing] = useState<PlaybookMarketing>(() => {
    if (boot?.marketing) return boot.marketing;
    return {
      ...defaultPlaybookMarketing(),
      art_request_form_url: SPM_ART_REQUEST_FORM_URL,
      engagement_goal_label: "QR scans",
      engagement_goal_target: 35,
      asset_requests: mergeAssetRequestsWithCatalog([]),
    };
  });
  const [webGraphicFile, setWebGraphicFile] = useState<File | null>(null);
  const [pageBannerFile, setPageBannerFile] = useState<File | null>(null);
  const [webGraphicDataUrl, setWebGraphicDataUrl] = useState<string | null>(
    null
  );
  const [pageBannerDataUrl, setPageBannerDataUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!webGraphicFile) {
      void Promise.resolve().then(() => setWebGraphicDataUrl(null));
      return;
    }
    let cancelled = false;
    const reader = new FileReader();
    reader.onload = () => {
      if (!cancelled && typeof reader.result === "string") {
        setWebGraphicDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(webGraphicFile);
    return () => {
      cancelled = true;
      reader.abort();
    };
  }, [webGraphicFile]);

  useEffect(() => {
    if (!pageBannerFile) {
      void Promise.resolve().then(() => setPageBannerDataUrl(null));
      return;
    }
    let cancelled = false;
    const reader = new FileReader();
    reader.onload = () => {
      if (!cancelled && typeof reader.result === "string") {
        setPageBannerDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(pageBannerFile);
    return () => {
      cancelled = true;
      reader.abort();
    };
  }, [pageBannerFile]);

  const [webGraphicServerUrl, setWebGraphicServerUrl] = useState<string | null>(
    null
  );
  const [pageBannerServerUrl, setPageBannerServerUrl] = useState<string | null>(
    null
  );

  const webGraphicMediaId = marketing.web_graphic_media_id;
  const pageBannerMediaId = marketing.page_banner_media_id;

  useEffect(() => {
    const row =
      !webGraphicFile && isEdit
        ? eventMedia.find((m) => m.id === webGraphicMediaId)
        : undefined;
    if (!row) {
      const t = setTimeout(() => setWebGraphicServerUrl(null), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    void createSignedEventDocumentUrl(supabase, row.file_path).then((url) => {
      if (!cancelled) setWebGraphicServerUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [webGraphicFile, webGraphicMediaId, eventMedia, isEdit]);

  useEffect(() => {
    const row =
      !pageBannerFile && isEdit
        ? eventMedia.find((m) => m.id === pageBannerMediaId)
        : undefined;
    if (!row) {
      const t = setTimeout(() => setPageBannerServerUrl(null), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    void createSignedEventDocumentUrl(supabase, row.file_path).then((url) => {
      if (!cancelled) setPageBannerServerUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [pageBannerFile, pageBannerMediaId, eventMedia, isEdit]);
  const [savedPrompt1Block, setSavedPrompt1Block] = useState<string | null>(
    null
  );
  const [prompt1Copied, setPrompt1Copied] = useState(false);

  const [fetchedMonthlyBudgets, setFetchedMonthlyBudgets] = useState<
    MonthlyBudget[]
  >([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetOverrideConfirmed, setBudgetOverrideConfirmed] =
    useState(false);
  const { pending, error, setError, clearError, run } = useFormSubmitState();

  const yearMonth =
    date.length >= 7 ? eventDateToYearMonth(date) : null;
  const locationTrimmed = place.trim();
  const locationKey = normalizeLocationKey(locationTrimmed);

  const budgetsFromParent =
    yearMonth != null &&
    prefetchedForYearMonth != null &&
    yearMonth === prefetchedForYearMonth &&
    prefetchedMonthlyBudgets !== undefined;

  const capBudgetRows = useMemo(() => {
    if (!yearMonth) return [];
    if (budgetsFromParent) return prefetchedMonthlyBudgets ?? [];
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

  useEffect(() => {
    void Promise.resolve().then(() => setBudgetOverrideConfirmed(false));
  }, [date, place, plannedBudget, yearMonth, workflow]);

  useEffect(() => {
    if (!onBudgetPeersMonthChange || !yearMonth) return;
    const t = setTimeout(() => onBudgetPeersMonthChange(yearMonth), 300);
    return () => clearTimeout(t);
  }, [date, onBudgetPeersMonthChange, yearMonth]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setSavedPrompt1Block(null);
      setPrompt1Copied(false);
    });
  }, [workflow.copy_prompts]);

  const frameworkSpend = useMemo(
    () => sumPlaybookFrameworkCosts(workflow),
    [workflow]
  );

  const budgetCheck = useMemo(() => {
    if (!yearMonth) {
      return {
        cap: 0,
        othersPlanned: 0,
        total: 0,
        exceeds: false,
        thisCommitted: 0,
      };
    }
    const thisPlanned = numOrNull(plannedBudget) ?? 0;
    const thisCommitted = thisPlanned + frameworkSpend;
    const cap = effectiveMonthlyCapForEvent(capBudgetRows, locationKey);
    const singleVenueMonth = capBudgetRows.length === 1;
    const othersPlanned = sumOthersPlannedForMonth(
      allEvents,
      yearMonth,
      singleVenueMonth ? "" : locationKey,
      editSourceEvent?.id
    );
    const total = othersPlanned + thisCommitted;
    const exceeds = cap > 0 && total > cap;
    return { cap, othersPlanned, total, exceeds, thisCommitted };
  }, [
    yearMonth,
    allEvents,
    capBudgetRows,
    locationKey,
    plannedBudget,
    frameworkSpend,
    editSourceEvent?.id,
  ]);

  const purposeGoalsText = NEW_EVENT_PURPOSE_LINES.join("\n");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (!title.trim() || !date) {
      setError("Event title and date are required.");
      return;
    }
    if (budgetCheck.exceeds && !budgetOverrideConfirmed) {
      setError(
        "This event would exceed the monthly venue cap. Confirm the override below or reduce planned / activity costs."
      );
      return;
    }

    const pre = workflow.pre_event ?? {};
    const wf: PlaybookWorkflow = {
      ...workflow,
      copy_prompts: {
        ...workflow.copy_prompts,
        location: workflow.copy_prompts?.location ?? "Milwaukee H-D",
      },
      facebook: {
        ...workflow.facebook,
        name: workflow.facebook?.name ?? title.trim(),
      },
    };

    const pm = normalizePlaybookMarketingDates({
      ...marketing,
      canva_web_banner_done: pre.canva_web_banner_downloaded ?? false,
      canva_fb_cover_done: pre.canva_fb_cover_downloaded ?? false,
      pam_map_approval_accepted: pre.pam_map_accepted ?? false,
      facebook_event_copy: [
        workflow.facebook?.name ? `Name: ${workflow.facebook.name}` : "",
        workflow.facebook?.details ? `\n\n${workflow.facebook.details}` : "",
      ]
        .join("")
        .trim() || null,
    });

    const body: CreateEventApiBody = {
      name: title.trim(),
      date,
      location: place.trim(),
      owner: owner.trim(),
      status:
        isEdit && editSourceEvent
          ? editSourceEvent.status
          : ("planning" as EventStatus),
      description: coreActivities.trim().slice(0, 20000),
      event_type: eventType === "" ? null : eventType,
      planned_budget: numOrNull(plannedBudget),
      actual_budget: isEdit
        ? editSourceEvent?.actual_budget != null
          ? Number(editSourceEvent.actual_budget)
          : null
        : null,
      event_goals:
        isEdit && editSourceEvent?.event_goals?.trim()
          ? editSourceEvent.event_goals
          : purposeGoalsText,
      core_activities: coreActivities.trim() || null,
      event_time_start: timeStart.trim() || null,
      event_time_end: timeEnd.trim() || null,
      playbook_workflow: wf,
      playbook_marketing: pm,
    };

    await run(async () => {
      await onSubmit({
        body,
        webGraphicFile,
        pageBannerFile,
      });
    });
  }

  const pre = workflow.pre_event ?? {};
  const cp = workflow.copy_prompts ?? {};
  const assets = mergeAssetRequestsWithCatalog(marketing.asset_requests);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      <StaticInfoCard title="Event Purpose & Goals">
        <ul className="list-disc pl-5 space-y-1 text-harley-text">
          {NEW_EVENT_PURPOSE_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-harley-orange font-semibold pt-2">
          GOAL: {NEW_EVENT_DEFAULT_QR_GOAL}
        </p>
        <p className="text-xs text-harley-text-muted pt-2">
          This block is a reminder only; goals are saved as text on the event.
        </p>
      </StaticInfoCard>

      <Card padding="lg">
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide mb-4">
          Event basics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Place *"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            required
            placeholder="e.g. Milwaukee H-D"
          />
          <Input
            label="Event title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="Date *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Start time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              placeholder="e.g. 10:00 AM"
            />
            <Input
              label="End time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              placeholder="e.g. 3:00 PM"
            />
          </div>
        </div>
        <div className="mt-4">
          <Textarea
            label="Core activities"
            value={coreActivities}
            onChange={(e) => setCoreActivities(e.target.value)}
            rows={3}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <Input
            label="Owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <div>
            <label className="block text-sm text-harley-text-muted mb-1.5">
              Event type
            </label>
            <select
              value={eventType}
              onChange={(e) =>
                setEventType((e.target.value || "") as EventType | "")
              }
              className="w-full px-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text"
            >
              <option value="">Not set</option>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Planned budget ($)"
            type="number"
            min={0}
            step={0.01}
            value={plannedBudget}
            onChange={(e) => setPlannedBudget(e.target.value)}
            placeholder="Optional"
          />
        </div>
        {frameworkSpend > 0 && (
          <p className="text-xs text-harley-text-muted mt-2">
            Playbook activity line estimates: {formatUsd(frameworkSpend)} (counts
            toward the monthly cap with planned budget).
          </p>
        )}
      </Card>

      <Card padding="lg" className="space-y-8">
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
          Activity budgets
        </h2>
        <LineItemBucket
          title="Food & Refreshments"
          hint="Each line can include a cost that counts toward the monthly venue budget."
          items={workflow.food_items ?? []}
          onChange={(items) =>
            setWorkflow((w) => ({ ...w, food_items: items }))
          }
        />
        <LineItemBucket
          title="Entertainment / Vendors"
          hint="Entertainment or vendor costs."
          items={workflow.entertainment_items ?? []}
          onChange={(items) =>
            setWorkflow((w) => ({ ...w, entertainment_items: items }))
          }
        />
        <LineItemBucket
          title="Bike-related or general activities"
          hint="Activities and related costs."
          items={workflow.bike_activities_items ?? []}
          onChange={(items) =>
            setWorkflow((w) => ({ ...w, bike_activities_items: items }))
          }
        />
        <LineItemBucket
          title="Engagement opportunities"
          hint="Engagement programs, raffles, etc."
          items={workflow.engagement_items ?? []}
          onChange={(items) =>
            setWorkflow((w) => ({ ...w, engagement_items: items }))
          }
        />
      </Card>

      <Card padding="lg" className="space-y-4">
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
          Pre-Event Preparation
        </h2>
        <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
          <input
            type="checkbox"
            checked={pre.theme_vendors_complete ?? false}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                pre_event: {
                  ...w.pre_event,
                  theme_vendors_complete: e.target.checked,
                },
              }))
            }
            className="rounded border-harley-gray"
          />
          Theme & Activities: Finalize theme and secure any outside vendors
        </label>
        <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
          <input
            type="checkbox"
            checked={pre.permits_complete ?? false}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                pre_event: {
                  ...w.pre_event,
                  permits_complete: e.target.checked,
                },
              }))
            }
            className="rounded border-harley-gray"
          />
          Permits / Approvals: food, music, raffles submitted
        </label>

        <div className="border-t border-harley-gray/40 pt-4 space-y-3">
          <p className="text-sm font-medium text-harley-text">Marketing assets</p>
          <a
            href={SPM_ART_REQUEST_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-harley-orange hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Art request form (SPM)
          </a>
          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Request sent"
              type="date"
              value={marketing.art_request_sent_at?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setMarketing((m) => ({
                  ...m,
                  art_request_sent_at: e.target.value || null,
                }))
              }
            />
            <Input
              label="Finals received"
              type="date"
              value={marketing.art_finals_received_at?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setMarketing((m) => ({
                  ...m,
                  art_finals_received_at: e.target.value || null,
                }))
              }
            />
            <Input
              label="PAM / MAP approval"
              type="date"
              value={marketing.pam_map_approval_at?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setMarketing((m) => ({
                  ...m,
                  pam_map_approval_at: e.target.value || null,
                }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
            <input
              type="checkbox"
              checked={pre.pam_map_accepted ?? false}
              onChange={(e) =>
                setWorkflow((w) => ({
                  ...w,
                  pre_event: {
                    ...w.pre_event,
                    pam_map_accepted: e.target.checked,
                  },
                }))
              }
              className="rounded border-harley-gray"
            />
            PAM / MAP accepted
          </label>
        </div>

        <div className="border-t border-harley-gray/40 pt-4">
          <p className="text-sm font-medium text-harley-text mb-2">
            Assets requested
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {assets.map((row) => {
              const label =
                PLAYBOOK_MARKETING_ASSET_CATALOG.find((a) => a.key === row.key)
                  ?.label ?? row.key;
              return (
                <label
                  key={row.key}
                  className="flex items-start gap-2 text-sm text-harley-text cursor-pointer rounded border border-harley-gray/35 p-2"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-harley-gray"
                    checked={row.requested}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setMarketing((m) => ({
                        ...m,
                        asset_requests: mergeAssetRequestsWithCatalog(
                          m.asset_requests
                        ).map((r) =>
                          r.key === row.key ? { ...r, requested: checked } : r
                        ),
                      }));
                    }}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </Card>

      <StaticInfoCard title="Internal Communication">
        <ul className="list-disc pl-5 space-y-1">
          {INTERNAL_COMMUNICATION_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </StaticInfoCard>

      <Card padding="lg" className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
          <input
            type="checkbox"
            checked={pre.publish_sop_complete ?? false}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                pre_event: {
                  ...w.pre_event,
                  publish_sop_complete: e.target.checked,
                },
              }))
            }
            className="rounded border-harley-gray"
          />
          Publish to Facebook / website — SOP complete
        </label>
        <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
          <input
            type="checkbox"
            checked={pre.canva_web_banner_downloaded ?? false}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                pre_event: {
                  ...w.pre_event,
                  canva_web_banner_downloaded: e.target.checked,
                },
              }))
            }
            className="rounded border-harley-gray"
          />
          Web banner in Canva — Downloaded and saved
        </label>
        <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
          <input
            type="checkbox"
            checked={pre.canva_fb_cover_downloaded ?? false}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                pre_event: {
                  ...w.pre_event,
                  canva_fb_cover_downloaded: e.target.checked,
                },
              }))
            }
            className="rounded border-harley-gray"
          />
          FB Event cover in Canva — Downloaded and saved
        </label>
      </Card>

      <Card padding="lg" className="space-y-4">
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
          Copy development
        </h2>
        <div className="rounded-lg bg-harley-black/30 p-3 text-sm text-harley-text-muted space-y-2">
          <p className="text-harley-text font-medium text-xs uppercase">
            Prompt 1
          </p>
          <p>{AI_PROMPT_1_FIXED}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Event name (prompt)"
            value={cp.event_name ?? ""}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                copy_prompts: { ...w.copy_prompts, event_name: e.target.value || null },
              }))
            }
            placeholder="Same as event title or alternate wording"
          />
          <Input
            label="Date (prompt)"
            value={cp.event_date_text ?? ""}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                copy_prompts: {
                  ...w.copy_prompts,
                  event_date_text: e.target.value || null,
                },
              }))
            }
          />
          <Input
            label="Location (prompt)"
            value={cp.location ?? ""}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                copy_prompts: { ...w.copy_prompts, location: e.target.value || null },
              }))
            }
            placeholder="Milwaukee H-D"
          />
          <Input
            label="Who it&apos;s for (prompt)"
            value={cp.who_its_for ?? ""}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                copy_prompts: {
                  ...w.copy_prompts,
                  who_its_for: e.target.value || null,
                },
              }))
            }
            placeholder="e.g. Anyone, riders 21+"
          />
        </div>
        <Textarea
          label="Food (prompt)"
          value={cp.food ?? ""}
          onChange={(e) =>
            setWorkflow((w) => ({
              ...w,
              copy_prompts: { ...w.copy_prompts, food: e.target.value || null },
            }))
          }
          rows={2}
        />
        <Textarea
          label="Entertainment (prompt)"
          value={cp.entertainment ?? ""}
          onChange={(e) =>
            setWorkflow((w) => ({
              ...w,
              copy_prompts: {
                ...w.copy_prompts,
                entertainment: e.target.value || null,
              },
            }))
          }
          rows={2}
        />
        <Textarea
          label="Perks / Discounts (prompt)"
          value={cp.perks_discounts ?? ""}
          onChange={(e) =>
            setWorkflow((w) => ({
              ...w,
              copy_prompts: {
                ...w.copy_prompts,
                perks_discounts: e.target.value || null,
              },
            }))
          }
          rows={2}
        />
        <Input
          label="Tone"
          value={cp.tone ?? ""}
          onChange={(e) =>
            setWorkflow((w) => ({
              ...w,
              copy_prompts: { ...w.copy_prompts, tone: e.target.value || null },
            }))
          }
        />
        <Textarea
          label="Any phrases to include"
          value={cp.phrases ?? ""}
          onChange={(e) =>
            setWorkflow((w) => ({
              ...w,
              copy_prompts: { ...w.copy_prompts, phrases: e.target.value || null },
            }))
          }
          rows={2}
        />
        <Textarea
          label="RSVP notes"
          value={cp.rsvp_notes ?? ""}
          onChange={(e) =>
            setWorkflow((w) => ({
              ...w,
              copy_prompts: {
                ...w.copy_prompts,
                rsvp_notes: e.target.value || null,
              },
            }))
          }
          rows={2}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSavedPrompt1Block(buildCopyDevelopmentPrompt1(cp));
              setPrompt1Copied(false);
            }}
          >
            Save prompt for copy
          </Button>
          <span className="text-xs text-harley-text-muted">
            Builds the block below from filled-in fields only.
          </span>
        </div>
        {savedPrompt1Block != null && (
          <div className="rounded-lg border border-harley-gray/50 bg-harley-black/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-harley-orange">
                Copy for AI agent
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  void navigator.clipboard.writeText(savedPrompt1Block).then(() => {
                    setPrompt1Copied(true);
                    window.setTimeout(() => setPrompt1Copied(false), 2000);
                  });
                }}
              >
                <Copy className="w-3.5 h-3.5" />
                {prompt1Copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="text-sm text-harley-text whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto rounded-md bg-harley-black/50 p-3 border border-harley-gray/30 select-all">
              {savedPrompt1Block}
            </pre>
          </div>
        )}
        <div className="rounded-lg bg-harley-black/30 p-3 text-sm text-harley-text-muted space-y-2">
          <p className="font-medium text-harley-text">Prompt 2</p>
          <p>{AI_PROMPT_2_FIXED}</p>
          <p className="font-medium text-harley-text pt-2">Prompt 3</p>
          <p>{AI_PROMPT_3_FIXED}</p>
        </div>
      </Card>

      <Card padding="lg" className="space-y-4">
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
          Web copy
        </h2>
        <Textarea
          label="Summary"
          value={marketing.web_summary ?? ""}
          onChange={(e) =>
            setMarketing((m) => ({
              ...m,
              web_summary: e.target.value || null,
            }))
          }
          rows={3}
        />
        <Input
          label="SEO meta title"
          value={marketing.seo_meta_title ?? ""}
          onChange={(e) =>
            setMarketing((m) => ({
              ...m,
              seo_meta_title: e.target.value || null,
            }))
          }
        />
        <Textarea
          label="SEO meta description"
          value={marketing.seo_meta_description ?? ""}
          onChange={(e) =>
            setMarketing((m) => ({
              ...m,
              seo_meta_description: e.target.value || null,
            }))
          }
          rows={2}
        />
        <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
          <input
            type="checkbox"
            checked={pre.upload_to_website_complete ?? false}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                pre_event: {
                  ...w.pre_event,
                  upload_to_website_complete: e.target.checked,
                },
              }))
            }
            className="rounded border-harley-gray"
          />
          Upload to info website
        </label>
        <div>
          <label className="block text-sm text-harley-text-muted mb-1.5">
            Graphic (upload)
          </label>
          <input
            type="file"
            accept="image/*"
            className="text-sm text-harley-text"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setWebGraphicFile(f);
            }}
          />
          {(webGraphicFile && !webGraphicDataUrl) || (webGraphicDataUrl || webGraphicServerUrl) ? (
            <div className="mt-2 rounded-lg border border-harley-gray/50 overflow-hidden bg-harley-black/20 max-w-md min-h-[5rem] flex items-center justify-center">
              {webGraphicFile && !webGraphicDataUrl ? (
                <p className="text-xs text-harley-text-muted px-3 py-4">
                  Loading preview…
                </p>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={(webGraphicDataUrl ?? webGraphicServerUrl) || undefined}
                  alt=""
                  className="max-h-48 w-full object-contain"
                />
              )}
            </div>
          ) : null}
          <p className="text-xs text-harley-text-muted mt-1">
            {webGraphicFile
              ? webGraphicFile.name
              : webGraphicMediaId
                ? "Saved — submit to replace"
                : "No file yet"}
          </p>
        </div>
        <Input
          label="Page URL"
          value={marketing.web_page_url ?? ""}
          onChange={(e) =>
            setMarketing((m) => ({ ...m, web_page_url: e.target.value || null }))
          }
        />
        <div>
          <label className="block text-sm text-harley-text-muted mb-1.5">
            Page banner (upload)
          </label>
          <input
            type="file"
            accept="image/*"
            className="text-sm text-harley-text"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPageBannerFile(f);
            }}
          />
          {(pageBannerFile && !pageBannerDataUrl) || (pageBannerDataUrl || pageBannerServerUrl) ? (
            <div className="mt-2 rounded-lg border border-harley-gray/50 overflow-hidden bg-harley-black/20 max-w-md min-h-[5rem] flex items-center justify-center">
              {pageBannerFile && !pageBannerDataUrl ? (
                <p className="text-xs text-harley-text-muted px-3 py-4">
                  Loading preview…
                </p>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={(pageBannerDataUrl ?? pageBannerServerUrl) || undefined}
                  alt=""
                  className="max-h-48 w-full object-contain"
                />
              )}
            </div>
          ) : null}
          <p className="text-xs text-harley-text-muted mt-1">
            {pageBannerFile
              ? pageBannerFile.name
              : pageBannerMediaId
                ? "Saved — submit to replace"
                : "No file yet"}
          </p>
        </div>
        <Textarea
          label="Page copy"
          value={workflow.web_extra?.page_copy ?? ""}
          onChange={(e) =>
            setWorkflow((w) => ({
              ...w,
              web_extra: {
                ...w.web_extra,
                page_copy: e.target.value || null,
              },
            }))
          }
          rows={4}
        />
      </Card>

      <StaticInfoCard title="Event to Website">
        <ul className="list-disc pl-5 space-y-1">
          {EVENT_TO_WEBSITE_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </StaticInfoCard>

      <StaticInfoCard title="Event to Facebook">
        <ul className="list-disc pl-5 space-y-1">
          {EVENT_TO_FACEBOOK_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </StaticInfoCard>

      <Card padding="lg" className="space-y-4">
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
          Facebook copy
        </h2>
        <Input
          label="Name"
          value={workflow.facebook?.name ?? ""}
          onChange={(e) =>
            setWorkflow((w) => ({
              ...w,
              facebook: { ...w.facebook, name: e.target.value || null },
            }))
          }
        />
        <Textarea
          label="Details"
          value={workflow.facebook?.details ?? ""}
          onChange={(e) =>
            setWorkflow((w) => ({
              ...w,
              facebook: { ...w.facebook, details: e.target.value || null },
            }))
          }
          rows={5}
        />
      </Card>

      <StaticInfoCard title="Event Week Flow">
        <pre className="whitespace-pre-wrap text-xs font-sans text-harley-text/90">
          {EVENT_WEEK_FLOW_COPY}
        </pre>
      </StaticInfoCard>

      <StaticInfoCard title="Post-Event Follow-Up">
        <pre className="whitespace-pre-wrap text-xs font-sans text-harley-text/90">
          {POST_EVENT_FOLLOW_UP_COPY}
        </pre>
      </StaticInfoCard>

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide">
          Roles &amp; responsibilities
        </h2>
        {(
          [
            ["marketing_lead", "Marketing lead"],
            ["sales_team", "Sales team"],
            ["service_team", "Service team"],
            ["motorclothes", "MotorClothes"],
            ["gm_owner", "GM / Owner"],
            ["volunteers_charities", "Volunteers / charities"],
          ] as const
        ).map(([key, label]) => (
          <Textarea
            key={key}
            label={label}
            value={(workflow.roles?.[key] as string | null | undefined) ?? ""}
            onChange={(e) =>
              setWorkflow((w) => ({
                ...w,
                roles: {
                  ...w.roles,
                  [key]: e.target.value || null,
                },
              }))
            }
            rows={2}
          />
        ))}
      </Card>

      <StaticInfoCard title="Metrics for success">
        <ul className="list-disc pl-5 space-y-1">
          {METRICS_FOR_SUCCESS_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </StaticInfoCard>

      <Card padding="lg">
        <h2 className="text-sm font-semibold text-harley-text uppercase tracking-wide mb-4">
          Checklist — materials
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-harley-gray/50 text-harley-text-muted">
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 font-medium">Notes / Executed</th>
              </tr>
            </thead>
            <tbody>
              {(workflow.materials_checklist ?? []).map((row, i) => (
                <tr key={row.item} className="border-b border-harley-gray/30">
                  <td className="py-2 pr-3 text-harley-text align-top">
                    {row.item}
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <input
                      className="w-full min-w-[8rem] px-2 py-1.5 rounded-md bg-harley-black/40 border border-harley-gray/50 text-harley-text text-xs"
                      value={row.description ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        setWorkflow((w) => {
                          const mc = [...(w.materials_checklist ?? [])];
                          mc[i] = { ...mc[i], description: v };
                          return { ...w, materials_checklist: mc };
                        });
                      }}
                    />
                  </td>
                  <td className="py-2 align-top">
                    <input
                      className="w-full min-w-[8rem] px-2 py-1.5 rounded-md bg-harley-black/40 border border-harley-gray/50 text-harley-text text-xs"
                      value={row.notes ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        setWorkflow((w) => {
                          const mc = [...(w.materials_checklist ?? [])];
                          mc[i] = { ...mc[i], notes: v };
                          return { ...w, materials_checklist: mc };
                        });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {yearMonth && (
        <Card padding="lg" className="border-harley-gray/50">
          <p className="text-sm font-medium text-harley-text mb-2">
            Monthly budget check
          </p>
          <p className="text-[11px] text-harley-text-muted">
            {budgetsLoadingEffective
              ? "Loading monthly cap…"
              : budgetCheck.cap > 0
                ? `Cap for ${yearMonth}${locationTrimmed ? ` · ${locationTrimmed}` : ""}: ${formatUsd(budgetCheck.cap)} · Other events: ${formatUsd(budgetCheck.othersPlanned)} · This draft: ${formatUsd(budgetCheck.thisCommitted)} planned + playbook lines`
                : "No cap row for this month/venue — add one on the Budget page for warnings."}
          </p>
          {budgetCheck.exceeds && (
            <div className="mt-3 rounded-lg border border-harley-warning/50 bg-harley-warning/10 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-harley-warning shrink-0" />
                <div className="text-sm text-harley-text">
                  <p className="font-medium text-harley-warning">
                    Exceeds monthly budget
                  </p>
                  <p className="text-harley-text-muted mt-1">
                    Total committed for {yearMonth} would be{" "}
                    <strong>{formatUsd(budgetCheck.total)}</strong> vs cap{" "}
                    <strong>{formatUsd(budgetCheck.cap)}</strong>.
                  </p>
                  <label className="flex items-start gap-2 mt-3 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={budgetOverrideConfirmed}
                      onChange={(e) => {
                        setBudgetOverrideConfirmed(e.target.checked);
                        if (e.target.checked) clearError();
                      }}
                      className="mt-1 rounded border-harley-gray"
                    />
                    <span>
                      I understand and want to{" "}
                      {isEdit ? "save these changes" : "create the event"}{" "}
                      anyway.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <FormErrorAlert message={error} />
      {pending ? (
        <p className="text-sm text-harley-text-muted">
          Saving… Large images may take a few seconds while files upload.
        </p>
      ) : null}
      <FormActions
        pending={pending}
        submitLabel={isEdit ? "Save changes" : "Create event"}
        onCancel={onCancel}
        order="submit-first"
      />
    </form>
  );
}
