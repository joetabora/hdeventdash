"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  EVENT_TYPES,
  type Event,
  type EventDocument,
  type EventMedia,
  type EventVendorWithVendor,
  type SwapMeetSpot,
} from "@/types/database";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createSignedEventDocumentUrl } from "@/lib/events";
import { formatUsd } from "@/lib/format-currency";
import {
  effectiveArtRequestFormUrl,
  getPlaybookMarketing,
  mergeAssetRequestsWithCatalog,
  PLAYBOOK_MARKETING_ASSET_CATALOG,
} from "@/lib/playbook-marketing";
import { getPlaybookWorkflow, type PlaybookWorkflow } from "@/lib/playbook-workflow";
import {
  AI_PROMPT_1_FIXED,
  AI_PROMPT_2_FIXED,
  AI_PROMPT_3_FIXED,
  EVENT_TO_FACEBOOK_LINES,
  EVENT_TO_WEBSITE_LINES,
  EVENT_WEEK_FLOW_COPY,
  INTERNAL_COMMUNICATION_LINES,
  NEW_EVENT_DEFAULT_QR_GOAL,
  NEW_EVENT_PURPOSE_LINES,
  POST_EVENT_FOLLOW_UP_COPY,
  SPM_ART_REQUEST_FORM_URL,
} from "@/lib/new-event-playbook-copy";

function dash(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t || "—";
}

function hasText(v: string | null | undefined): boolean {
  return (v ?? "").trim().length > 0;
}

function mediaFilePathForPlaybookId(
  eventMedia: EventMedia[],
  id: string | null | undefined
): string | null {
  if (!id?.trim()) return null;
  const needle = id.trim().toLowerCase();
  const row = eventMedia.find((m) => m.id.trim().toLowerCase() === needle);
  return row?.file_path ?? null;
}

function boolMark(done: boolean | undefined): string {
  return done ? "☑" : "☐";
}

function printLineItems(
  w: PlaybookWorkflow,
  key: keyof PlaybookWorkflow,
  documentsById: Map<string, EventDocument>
) {
  const items = ((w[key] as PlaybookWorkflow["food_items"]) ?? []).filter(
    (row) =>
      hasText(row.name) ||
      hasText(row.description) ||
      (row.cost ?? 0) > 0 ||
      Boolean(row.invoice_document_id)
  );
  if (!items.length) return null;
  return (
    <table className="eprint-table">
      <thead>
        <tr>
          <th>Name / vendor</th>
          <th>Description</th>
          <th className="eprint-num">Est. cost</th>
          <th>Invoice</th>
        </tr>
      </thead>
      <tbody>
        {items.map((row, i) => {
          const invoiceDoc = row.invoice_document_id
            ? documentsById.get(row.invoice_document_id)
            : undefined;
          return (
            <tr key={i}>
              <td>{dash(row.name)}</td>
              <td>{dash(row.description)}</td>
              <td className="eprint-num">
                {row.cost != null && Number(row.cost) > 0
                  ? formatUsd(Number(row.cost))
                  : "—"}
              </td>
              <td>{invoiceDoc?.file_name ?? (row.invoice_document_id ? "Attached" : "—")}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function EventPlaybookPrintDocument({
  event,
  eventMedia,
  eventDocuments = [],
  orgMarketingArtFormUrl,
  swapMeetSpots = [],
  eventVendors = [],
}: {
  event: Event;
  eventMedia: EventMedia[];
  eventDocuments?: EventDocument[];
  orgMarketingArtFormUrl: string | null;
  swapMeetSpots?: SwapMeetSpot[];
  eventVendors?: EventVendorWithVendor[];
}) {
  const w = getPlaybookWorkflow(event);
  const documentsById = useMemo(
    () => new Map(eventDocuments.map((d) => [d.id, d])),
    [eventDocuments]
  );
  const pre = w.pre_event ?? {};
  const cp = w.copy_prompts ?? {};
  const fb = w.facebook ?? {};
  const roles = w.roles ?? {};
  const pm = getPlaybookMarketing(event);
  const artUrl =
    effectiveArtRequestFormUrl(event, orgMarketingArtFormUrl) ??
    SPM_ART_REQUEST_FORM_URL;
  const assets = mergeAssetRequestsWithCatalog(pm.asset_requests);
  const catalogLabelByKey = new Map(
    PLAYBOOK_MARKETING_ASSET_CATALOG.map((a) => [a.key, a.label])
  );

  const graphicPath = mediaFilePathForPlaybookId(
    eventMedia,
    pm.web_graphic_media_id
  );
  const bannerPath = mediaFilePathForPlaybookId(
    eventMedia,
    pm.page_banner_media_id
  );

  const blobRevokeRef = useRef<string[]>([]);

  const [webGraphicPrintUrl, setWebGraphicPrintUrl] = useState<string | null>(
    null
  );
  const [pageBannerPrintUrl, setPageBannerPrintUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    for (const u of blobRevokeRef.current) URL.revokeObjectURL(u);
    blobRevokeRef.current = [];

    if (!graphicPath && !bannerPath) {
      const t = setTimeout(() => {
        setWebGraphicPrintUrl(null);
        setPageBannerPrintUrl(null);
      }, 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    async function pathToPrintableUrl(
      path: string | null
    ): Promise<string | null> {
      if (!path) return null;
      const signed = await createSignedEventDocumentUrl(supabase, path);
      if (!signed || cancelled) return null;
      try {
        const res = await fetch(signed);
        if (!res.ok) return signed;
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobRevokeRef.current.push(objectUrl);
        return objectUrl;
      } catch {
        return signed;
      }
    }

    void (async () => {
      const [gu, bu] = await Promise.all([
        pathToPrintableUrl(graphicPath),
        pathToPrintableUrl(bannerPath),
      ]);
      if (!cancelled) {
        setWebGraphicPrintUrl(gu);
        setPageBannerPrintUrl(bu);
      }
    })();

    return () => {
      cancelled = true;
      for (const u of blobRevokeRef.current) URL.revokeObjectURL(u);
      blobRevokeRef.current = [];
    };
  }, [graphicPath, bannerPath]);

  const eventTypeLabel = event.event_type
    ? EVENT_TYPES.find((t) => t.value === event.event_type)?.label ??
      event.event_type
    : null;

  const eventDetailRows: { label: string; value: string }[] = [];
  if (hasText(event.location)) {
    eventDetailRows.push({ label: "Place", value: event.location.trim() });
  }
  if (hasText(event.name)) {
    eventDetailRows.push({ label: "Event title", value: event.name.trim() });
  }
  if (event.date) {
    eventDetailRows.push({
      label: "Date",
      value: format(parseISO(event.date), "MMMM d, yyyy"),
    });
  }
  const timeStart = (event.event_time_start ?? "").trim();
  const timeEnd = (event.event_time_end ?? "").trim();
  if (timeStart || timeEnd) {
    eventDetailRows.push({
      label: "Start / end time",
      value: [timeStart, timeEnd].filter(Boolean).join(" — "),
    });
  }
  const coreActivities = (event.core_activities ?? event.description ?? "").trim();
  if (coreActivities) {
    eventDetailRows.push({ label: "Core activities", value: coreActivities });
  }
  if (eventTypeLabel) {
    eventDetailRows.push({ label: "Event type", value: eventTypeLabel });
  }
  if (
    event.planned_budget != null &&
    Number.isFinite(Number(event.planned_budget)) &&
    Number(event.planned_budget) > 0
  ) {
    eventDetailRows.push({
      label: "Planned budget",
      value: formatUsd(Number(event.planned_budget)),
    });
  }

  const copyPromptRows = (
    [
      ["Event name", cp.event_name],
      ["Date", cp.event_date_text],
      ["Location", cp.location],
      ["Who it's for", cp.who_its_for],
      ["Food", cp.food],
      ["Entertainment", cp.entertainment],
      ["Perks / discounts", cp.perks_discounts],
      ["Tone", cp.tone],
      ["Phrases to include", cp.phrases],
      ["RSVP notes", cp.rsvp_notes],
    ] as const
  ).filter(([, val]) => hasText(val));

  const webCopyRows = (
    [
      ["Summary", pm.web_summary],
      ["SEO meta title", pm.seo_meta_title],
      ["SEO meta description", pm.seo_meta_description],
      ["Page URL", pm.web_page_url],
      ["Page copy", w.web_extra?.page_copy],
    ] as const
  ).filter(([, val]) => hasText(val));

  const facebookRows = (
    [
      ["Name", fb.name],
      ["Details", fb.details],
      ["Stored Facebook event copy", pm.facebook_event_copy],
    ] as const
  ).filter(([, val]) => hasText(val));

  const roleRows = (
    [
      ["Marketing lead", roles.marketing_lead],
      ["Sales team", roles.sales_team],
      ["Service team", roles.service_team],
      ["MotorClothes", roles.motorclothes],
      ["GM / owner", roles.gm_owner],
      ["Volunteers / charities", roles.volunteers_charities],
    ] as const
  ).filter(([, val]) => hasText(val));

  const materialsRows = (w.materials_checklist ?? []).filter(
    (row) => hasText(row.description) || hasText(row.notes)
  );

  const preEventChecks = [
    pre.theme_vendors_complete && "Theme & activities: Finalize theme and secure outside vendors",
    pre.permits_complete && "Permits / approvals: food, music, raffles submitted",
    pre.publish_sop_complete && "Publish to Facebook / website — SOP complete",
    pre.canva_web_banner_downloaded && "Web banner in Canva — downloaded & saved",
    pre.canva_fb_cover_downloaded && "FB Event cover in Canva — downloaded & saved",
  ].filter(Boolean) as string[];

  const marketingAssetRows = assets.filter((a) => a.requested || hasText(a.notes));

  const hasFilledBudgetBucket = (key: keyof PlaybookWorkflow) =>
    ((w[key] as PlaybookWorkflow["food_items"]) ?? []).some(
      (row) =>
        hasText(row.name) ||
        hasText(row.description) ||
        (row.cost ?? 0) > 0 ||
        Boolean(row.invoice_document_id)
    );

  const hasActivityBudgets =
    hasFilledBudgetBucket("food_items") ||
    hasFilledBudgetBucket("entertainment_items") ||
    hasFilledBudgetBucket("bike_activities_items") ||
    hasFilledBudgetBucket("engagement_items");

  const hasPreEventSection =
    preEventChecks.length > 0 ||
    hasText(pm.art_request_sent_at) ||
    hasText(pm.art_finals_received_at) ||
    hasText(pm.pam_map_approval_at) ||
    pre.pam_map_accepted ||
    pm.pam_map_approval_accepted ||
    marketingAssetRows.length > 0;

  return (
    <article className="event-playbook-print text-black bg-white">
      <header className="eprint-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/MKElogo.png"
          alt="Milwaukee Harley-Davidson"
          className="eprint-header-logo h-auto w-auto max-h-[8.5rem] max-w-[15rem] object-contain"
          width={416}
          height={136}
          decoding="async"
        />
        <p className="eprint-kicker">Milwaukee Harley-Davidson</p>
        <h1 className="eprint-title">Event Playbook</h1>
        <h2 className="eprint-event-name">{dash(event.name)}</h2>
        <dl className="eprint-meta">
          <div>
            <dt>Date</dt>
            <dd>
              {event.date
                ? format(parseISO(event.date), "EEEE, MMMM d, yyyy")
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Place</dt>
            <dd>{dash(event.location)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{dash(event.status?.replace(/_/g, " "))}</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{dash(event.owner)}</dd>
          </div>
        </dl>
      </header>

      <section className="eprint-section">
        <h2 className="eprint-h2">Event purpose &amp; goals</h2>
        <p className="eprint-note">
          (Reference — why we run events)
        </p>
        <ul className="eprint-list">
          {NEW_EVENT_PURPOSE_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="eprint-goal">
          <strong>GOAL:</strong>{" "}
          {pm.engagement_goal_target != null
            ? `${pm.engagement_goal_target.toLocaleString()} ${pm.engagement_goal_label ?? "QR scans"}`
            : NEW_EVENT_DEFAULT_QR_GOAL}
        </p>
      </section>

      {eventDetailRows.length > 0 ? (
      <section className="eprint-section">
        <h2 className="eprint-h2">Event details</h2>
        <table className="eprint-table eprint-kv">
          <tbody>
            {eventDetailRows.map(({ label, value }) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      ) : null}

      {hasActivityBudgets ? (
      <section className="eprint-section">
        <h2 className="eprint-h2">Activity budgets</h2>
        {hasFilledBudgetBucket("food_items") ? (
          <>
            <h3 className="eprint-h3">Food &amp; refreshments</h3>
            {printLineItems(w, "food_items", documentsById)}
          </>
        ) : null}
        {hasFilledBudgetBucket("entertainment_items") ? (
          <>
            <h3 className="eprint-h3">Entertainment / vendors</h3>
            {printLineItems(w, "entertainment_items", documentsById)}
          </>
        ) : null}
        {hasFilledBudgetBucket("bike_activities_items") ? (
          <>
            <h3 className="eprint-h3">Bike-related or general activities</h3>
            {printLineItems(w, "bike_activities_items", documentsById)}
          </>
        ) : null}
        {hasFilledBudgetBucket("engagement_items") ? (
          <>
            <h3 className="eprint-h3">Engagement opportunities</h3>
            {printLineItems(w, "engagement_items", documentsById)}
          </>
        ) : null}
      </section>
      ) : null}

      {hasPreEventSection ? (
      <section className="eprint-section">
        <h2 className="eprint-h2">Pre-event preparation</h2>
        {preEventChecks.length > 0 ? (
          <ul className="eprint-checklist">
            {preEventChecks.map((line) => (
              <li key={line}>☑ {line}</li>
            ))}
          </ul>
        ) : null}

        {(hasText(pm.art_request_sent_at) ||
          hasText(pm.art_finals_received_at) ||
          hasText(pm.pam_map_approval_at) ||
          pre.pam_map_accepted ||
          pm.pam_map_approval_accepted ||
          marketingAssetRows.length > 0) && (
          <>
        <h3 className="eprint-h3">Marketing assets</h3>
        <p className="eprint-small">
          Art request form (SPM):{" "}
          <span className="eprint-break-all">{artUrl}</span>
        </p>
        {(hasText(pm.art_request_sent_at) ||
          hasText(pm.art_finals_received_at) ||
          hasText(pm.pam_map_approval_at) ||
          pre.pam_map_accepted ||
          pm.pam_map_approval_accepted) && (
        <table className="eprint-table eprint-kv eprint-small">
          <tbody>
            {hasText(pm.art_request_sent_at) ? (
              <tr>
                <th scope="row">Request sent</th>
                <td>{pm.art_request_sent_at!.trim()}</td>
              </tr>
            ) : null}
            {hasText(pm.art_finals_received_at) ? (
              <tr>
                <th scope="row">Finals received</th>
                <td>{pm.art_finals_received_at!.trim()}</td>
              </tr>
            ) : null}
            {hasText(pm.pam_map_approval_at) ? (
              <tr>
                <th scope="row">PAM / MAP approval (date)</th>
                <td>{pm.pam_map_approval_at!.trim()}</td>
              </tr>
            ) : null}
            {(pre.pam_map_accepted || pm.pam_map_approval_accepted) ? (
              <tr>
                <th scope="row">PAM / MAP accepted</th>
                <td>{boolMark(pre.pam_map_accepted ?? pm.pam_map_approval_accepted)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        )}

        {marketingAssetRows.length > 0 ? (
          <>
        <h4 className="eprint-h4">Assets requested</h4>
        <ul className="eprint-list eprint-two-col">
          {marketingAssetRows.map((a) => (
            <li key={a.key}>
              {boolMark(a.requested)}{" "}
              {catalogLabelByKey.get(a.key) ?? a.key}
              {a.notes?.trim() ? ` — ${a.notes.trim()}` : ""}
            </li>
          ))}
        </ul>
          </>
        ) : null}
          </>
        )}
      </section>
      ) : null}

      {copyPromptRows.length > 0 ? (
      <section className="eprint-section">
        <h2 className="eprint-h2">Copy development</h2>
        <h3 className="eprint-h3">Prompt 1</h3>
        <p className="eprint-preserve">{AI_PROMPT_1_FIXED}</p>
        <table className="eprint-table eprint-kv">
          <tbody>
            {copyPromptRows.map(([label, val]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{val!.trim()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="eprint-h3">Prompt 2</h3>
        <p className="eprint-preserve">{AI_PROMPT_2_FIXED}</p>
        <h3 className="eprint-h3">Prompt 3</h3>
        <p className="eprint-preserve">{AI_PROMPT_3_FIXED}</p>
      </section>
      ) : null}

      {(webCopyRows.length > 0 ||
        pre.upload_to_website_complete ||
        webGraphicPrintUrl ||
        pageBannerPrintUrl) ? (
      <section className="eprint-section">
        <h2 className="eprint-h2">Web copy</h2>
        {webCopyRows.length > 0 ? (
        <table className="eprint-table eprint-kv">
          <tbody>
            {webCopyRows.map(([label, val]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td className={label === "Page URL" ? "eprint-break-all" : undefined}>
                  {val!.trim()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        ) : null}
        {pre.upload_to_website_complete ? (
          <p className="eprint-small mt-2">☑ Upload to website complete</p>
        ) : null}
        {webGraphicPrintUrl || pageBannerPrintUrl ? (
          <div className="eprint-web-assets">
            {webGraphicPrintUrl ? (
              <figure className="eprint-figure">
                <figcaption>Web graphic</figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={webGraphicPrintUrl}
                  alt=""
                  className="eprint-asset-img"
                  loading="eager"
                  decoding="sync"
                />
              </figure>
            ) : null}
            {pageBannerPrintUrl ? (
              <figure className="eprint-figure">
                <figcaption>Page banner</figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pageBannerPrintUrl}
                  alt=""
                  className="eprint-asset-img"
                  loading="eager"
                  decoding="sync"
                />
              </figure>
            ) : null}
          </div>
        ) : null}
      </section>
      ) : null}

      {facebookRows.length > 0 ? (
      <section className="eprint-section">
        <h2 className="eprint-h2">Facebook copy</h2>
        <table className="eprint-table eprint-kv">
          <tbody>
            {facebookRows.map(([label, val]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td className={label === "Details" || label === "Stored Facebook event copy" ? "eprint-preserve" : undefined}>
                  {val!.trim()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      ) : null}

      {(hasText(event.giveaway_description) ||
        hasText(event.giveaway_link) ||
        hasText(event.rsvp_incentive) ||
        hasText(event.rsvp_link)) && (
        <section className="eprint-section">
          <h2 className="eprint-h2">Promotions &amp; RSVP (event record)</h2>
          <table className="eprint-table eprint-kv">
            <tbody>
              {hasText(event.giveaway_description) ? (
              <tr>
                <th scope="row">Giveaway</th>
                <td>{event.giveaway_description!.trim()}</td>
              </tr>
              ) : null}
              {hasText(event.giveaway_link) ? (
              <tr>
                <th scope="row">Giveaway link</th>
                <td className="eprint-break-all">{event.giveaway_link!.trim()}</td>
              </tr>
              ) : null}
              {hasText(event.rsvp_incentive) ? (
              <tr>
                <th scope="row">RSVP incentive</th>
                <td>{event.rsvp_incentive!.trim()}</td>
              </tr>
              ) : null}
              {hasText(event.rsvp_link) ? (
              <tr>
                <th scope="row">RSVP link</th>
                <td className="eprint-break-all">{event.rsvp_link!.trim()}</td>
              </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      )}

      <section className="eprint-section eprint-static">
        <h2 className="eprint-h2">Internal communication</h2>
        <p className="eprint-note">(Procedure reminder)</p>
        <ul className="eprint-list">
          {INTERNAL_COMMUNICATION_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="eprint-section eprint-static">
        <h2 className="eprint-h2">Event to website</h2>
        <p className="eprint-note">(Procedure reminder)</p>
        <ol className="eprint-list-num">
          {EVENT_TO_WEBSITE_LINES.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="eprint-section eprint-static">
        <h2 className="eprint-h2">Event to Facebook</h2>
        <p className="eprint-note">(Procedure reminder)</p>
        <ol className="eprint-list-num">
          {EVENT_TO_FACEBOOK_LINES.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="eprint-section eprint-static">
        <h2 className="eprint-h2">Event week flow</h2>
        <p className="eprint-preserve eprint-week">{EVENT_WEEK_FLOW_COPY}</p>
      </section>

      <section className="eprint-section eprint-static">
        <h2 className="eprint-h2">Post-event follow-up</h2>
        <p className="eprint-preserve eprint-week">{POST_EVENT_FOLLOW_UP_COPY}</p>
      </section>

      {roleRows.length > 0 ? (
      <section className="eprint-section">
        <h2 className="eprint-h2">Roles &amp; responsibilities</h2>
        <table className="eprint-table eprint-kv">
          <tbody>
            {roleRows.map(([label, val]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{val!.trim()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      ) : null}

      {materialsRows.length > 0 ? (
      <section className="eprint-section">
        <h2 className="eprint-h2">Materials checklist</h2>
        <table className="eprint-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>Notes / executed</th>
            </tr>
          </thead>
          <tbody>
            {materialsRows.map((row) => (
              <tr key={row.item}>
                <td>{row.item}</td>
                <td>{hasText(row.description) ? row.description!.trim() : "—"}</td>
                <td>{hasText(row.notes) ? row.notes!.trim() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      ) : null}

      {eventVendors.length > 0 ? (
        <section className="eprint-section">
          <h2 className="eprint-h2">Vendors &amp; fees</h2>
          <table className="eprint-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th className="eprint-num">Agreed fee</th>
              </tr>
            </thead>
            <tbody>
              {eventVendors.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    {ev.vendor?.name?.trim() || "Vendor"}
                  </td>
                  <td className="eprint-num">
                    {ev.agreed_fee != null && Number(ev.agreed_fee) > 0
                      ? formatUsd(Number(ev.agreed_fee))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {swapMeetSpots.length > 0 ? (
        <section className="eprint-section">
          <h2 className="eprint-h2">Swap meet spots</h2>
          <table className="eprint-table eprint-small">
            <thead>
              <tr>
                <th>Name</th>
                <th>Spot size</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {swapMeetSpots.map((s) => (
                <tr key={s.id}>
                  <td>{dash(s.name)}</td>
                  <td>{dash(s.spot_size)}</td>
                  <td>
                    {[s.email, s.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <footer className="eprint-footer">
        <p>
          Printed from MKEHD Event Dashboard ·{" "}
          {format(new Date(), "MMM d, yyyy h:mm a")}
        </p>
        <p className="eprint-small eprint-muted">
          Event ID: {event.id}
        </p>
      </footer>
    </article>
  );
}
