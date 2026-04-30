"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import {
  EVENT_TYPES,
  type Event,
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
  METRICS_FOR_SUCCESS_LINES,
  NEW_EVENT_DEFAULT_QR_GOAL,
  NEW_EVENT_PURPOSE_LINES,
  POST_EVENT_FOLLOW_UP_COPY,
  SPM_ART_REQUEST_FORM_URL,
} from "@/lib/new-event-playbook-copy";

function dash(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t || "—";
}

function boolMark(done: boolean | undefined): string {
  return done ? "☑" : "☐";
}

function printLineItems(w: PlaybookWorkflow, key: keyof PlaybookWorkflow) {
  const items = (w[key] as PlaybookWorkflow["food_items"]) ?? [];
  if (!items.length) {
    return (
      <p className="eprint-muted eprint-small">No line items recorded.</p>
    );
  }
  return (
    <table className="eprint-table">
      <thead>
        <tr>
          <th>Name / vendor</th>
          <th>Description</th>
          <th className="eprint-num">Est. cost</th>
        </tr>
      </thead>
      <tbody>
        {items.map((row, i) => (
          <tr key={i}>
            <td>{dash(row.name)}</td>
            <td>{dash(row.description)}</td>
            <td className="eprint-num">
              {row.cost != null && Number(row.cost) > 0
                ? formatUsd(Number(row.cost))
                : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EventPlaybookPrintDocument({
  event,
  eventMedia,
  orgMarketingArtFormUrl,
  swapMeetSpots = [],
  eventVendors = [],
}: {
  event: Event;
  eventMedia: EventMedia[];
  orgMarketingArtFormUrl: string | null;
  swapMeetSpots?: SwapMeetSpot[];
  eventVendors?: EventVendorWithVendor[];
}) {
  const w = getPlaybookWorkflow(event);
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

  const graphicPath = pm.web_graphic_media_id
    ? eventMedia.find((m) => m.id === pm.web_graphic_media_id)?.file_path ??
      null
    : null;
  const bannerPath = pm.page_banner_media_id
    ? eventMedia.find((m) => m.id === pm.page_banner_media_id)?.file_path ??
      null
    : null;

  const [webGraphicPrintUrl, setWebGraphicPrintUrl] = useState<string | null>(
    null
  );
  const [pageBannerPrintUrl, setPageBannerPrintUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!graphicPath && !bannerPath) {
      const t = setTimeout(() => {
        setWebGraphicPrintUrl(null);
        setPageBannerPrintUrl(null);
      }, 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const gu = graphicPath
        ? await createSignedEventDocumentUrl(supabase, graphicPath)
        : null;
      const bu = bannerPath
        ? await createSignedEventDocumentUrl(supabase, bannerPath)
        : null;
      if (!cancelled) {
        setWebGraphicPrintUrl(gu);
        setPageBannerPrintUrl(bu);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [graphicPath, bannerPath]);

  const eventTypeLabel = event.event_type
    ? EVENT_TYPES.find((t) => t.value === event.event_type)?.label ??
      event.event_type
    : null;

  return (
    <article className="event-playbook-print text-black bg-white">
      <header className="eprint-cover">
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

      <section className="eprint-section">
        <h2 className="eprint-h2">Event details</h2>
        <table className="eprint-table eprint-kv">
          <tbody>
            <tr>
              <th scope="row">Place</th>
              <td>{dash(event.location)}</td>
            </tr>
            <tr>
              <th scope="row">Event title</th>
              <td>{dash(event.name)}</td>
            </tr>
            <tr>
              <th scope="row">Date</th>
              <td>
                {event.date
                  ? format(parseISO(event.date), "MMMM d, yyyy")
                  : "—"}
              </td>
            </tr>
            <tr>
              <th scope="row">Start / end time</th>
              <td>
                {dash(event.event_time_start)} — {dash(event.event_time_end)}
              </td>
            </tr>
            <tr>
              <th scope="row">Core activities</th>
              <td>{dash(event.core_activities ?? event.description)}</td>
            </tr>
            <tr>
              <th scope="row">Event type</th>
              <td>{eventTypeLabel ?? "—"}</td>
            </tr>
            <tr>
              <th scope="row">Planned budget</th>
              <td>
                {event.planned_budget != null &&
                Number.isFinite(Number(event.planned_budget))
                  ? formatUsd(Number(event.planned_budget))
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="eprint-section">
        <h2 className="eprint-h2">Activity budgets</h2>
        <h3 className="eprint-h3">Food &amp; refreshments</h3>
        {printLineItems(w, "food_items")}
        <h3 className="eprint-h3">Entertainment / vendors</h3>
        {printLineItems(w, "entertainment_items")}
        <h3 className="eprint-h3">Bike-related or general activities</h3>
        {printLineItems(w, "bike_activities_items")}
        <h3 className="eprint-h3">Engagement opportunities</h3>
        {printLineItems(w, "engagement_items")}
      </section>

      <section className="eprint-section">
        <h2 className="eprint-h2">Pre-event preparation</h2>
        <ul className="eprint-checklist">
          <li>
            {boolMark(pre.theme_vendors_complete)} Theme &amp; activities:
            Finalize theme and secure outside vendors
          </li>
          <li>
            {boolMark(pre.permits_complete)} Permits / approvals: food, music,
            raffles submitted
          </li>
        </ul>

        <h3 className="eprint-h3">Marketing assets</h3>
        <p className="eprint-small">
          Art request form (SPM):{" "}
          <span className="eprint-break-all">{artUrl}</span>
        </p>
        <table className="eprint-table eprint-kv eprint-small">
          <tbody>
            <tr>
              <th scope="row">Request sent</th>
              <td>{dash(pm.art_request_sent_at)}</td>
            </tr>
            <tr>
              <th scope="row">Finals received</th>
              <td>{dash(pm.art_finals_received_at)}</td>
            </tr>
            <tr>
              <th scope="row">PAM / MAP approval (date)</th>
              <td>{dash(pm.pam_map_approval_at)}</td>
            </tr>
            <tr>
              <th scope="row">PAM / MAP accepted</th>
              <td>{boolMark(pre.pam_map_accepted ?? pm.pam_map_approval_accepted)}</td>
            </tr>
          </tbody>
        </table>

        <h4 className="eprint-h4">Assets requested</h4>
        <ul className="eprint-list eprint-two-col">
          {assets.map((a) => (
            <li key={a.key}>
              {boolMark(a.requested)}{" "}
              {catalogLabelByKey.get(a.key) ?? a.key}
              {a.notes?.trim() ? ` — ${a.notes.trim()}` : ""}
            </li>
          ))}
        </ul>

        <ul className="eprint-checklist eprint-spaced">
          <li>
            {boolMark(pre.publish_sop_complete)} Publish to Facebook / website — SOP complete
          </li>
          <li>
            {boolMark(pre.canva_web_banner_downloaded)} Web banner in Canva — downloaded &amp; saved
          </li>
          <li>
            {boolMark(pre.canva_fb_cover_downloaded)} FB Event cover in Canva — downloaded &amp; saved
          </li>
        </ul>
      </section>

      <section className="eprint-section">
        <h2 className="eprint-h2">Copy development</h2>
        <h3 className="eprint-h3">Prompt 1</h3>
        <p className="eprint-preserve">{AI_PROMPT_1_FIXED}</p>
        <table className="eprint-table eprint-kv">
          <tbody>
            {[
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
            ].map(([label, val]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{dash(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="eprint-h3">Prompt 2</h3>
        <p className="eprint-preserve">{AI_PROMPT_2_FIXED}</p>
        <h3 className="eprint-h3">Prompt 3</h3>
        <p className="eprint-preserve">{AI_PROMPT_3_FIXED}</p>
      </section>

      <section className="eprint-section">
        <h2 className="eprint-h2">Web copy</h2>
        <table className="eprint-table eprint-kv">
          <tbody>
            <tr>
              <th scope="row">Summary</th>
              <td>{dash(pm.web_summary)}</td>
            </tr>
            <tr>
              <th scope="row">SEO meta title</th>
              <td>{dash(pm.seo_meta_title)}</td>
            </tr>
            <tr>
              <th scope="row">SEO meta description</th>
              <td>{dash(pm.seo_meta_description)}</td>
            </tr>
            <tr>
              <th scope="row">Upload to website complete</th>
              <td>{boolMark(pre.upload_to_website_complete)}</td>
            </tr>
            <tr>
              <th scope="row">Page URL</th>
              <td className="eprint-break-all">{dash(pm.web_page_url)}</td>
            </tr>
            <tr>
              <th scope="row">Page copy</th>
              <td>{dash(w.web_extra?.page_copy)}</td>
            </tr>
          </tbody>
        </table>
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
                />
              </figure>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="eprint-section">
        <h2 className="eprint-h2">Facebook copy</h2>
        <table className="eprint-table eprint-kv">
          <tbody>
            <tr>
              <th scope="row">Name</th>
              <td>{dash(fb.name)}</td>
            </tr>
            <tr>
              <th scope="row">Details</th>
              <td className="eprint-preserve">{dash(fb.details)}</td>
            </tr>
            <tr>
              <th scope="row">Stored Facebook event copy</th>
              <td className="eprint-preserve">{dash(pm.facebook_event_copy)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {(event.giveaway_description ||
        event.giveaway_link ||
        event.rsvp_incentive ||
        event.rsvp_link) && (
        <section className="eprint-section">
          <h2 className="eprint-h2">Promotions &amp; RSVP (event record)</h2>
          <table className="eprint-table eprint-kv">
            <tbody>
              <tr>
                <th scope="row">Giveaway</th>
                <td>{dash(event.giveaway_description)}</td>
              </tr>
              <tr>
                <th scope="row">Giveaway link</th>
                <td className="eprint-break-all">{dash(event.giveaway_link)}</td>
              </tr>
              <tr>
                <th scope="row">RSVP incentive</th>
                <td>{dash(event.rsvp_incentive)}</td>
              </tr>
              <tr>
                <th scope="row">RSVP link</th>
                <td className="eprint-break-all">{dash(event.rsvp_link)}</td>
              </tr>
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

      <section className="eprint-section">
        <h2 className="eprint-h2">Roles &amp; responsibilities</h2>
        <table className="eprint-table eprint-kv">
          <tbody>
            {(
              [
                ["Marketing lead", roles.marketing_lead],
                ["Sales team", roles.sales_team],
                ["Service team", roles.service_team],
                ["MotorClothes", roles.motorclothes],
                ["GM / owner", roles.gm_owner],
                ["Volunteers / charities", roles.volunteers_charities],
              ] as const
            ).map(([label, val]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{dash(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="eprint-section eprint-static">
        <h2 className="eprint-h2">Metrics for success</h2>
        <ul className="eprint-list">
          {METRICS_FOR_SUCCESS_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

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
            {(w.materials_checklist ?? []).map((row) => (
              <tr key={row.item}>
                <td>{row.item}</td>
                <td>{dash(row.description)}</td>
                <td>{dash(row.notes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
