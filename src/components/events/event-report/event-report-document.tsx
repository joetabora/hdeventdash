"use client";

import { format, parseISO } from "date-fns";

import type { EventReportModel, EventReportSection } from "@/lib/event-report/types";

function ReportSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="ereport-section-title font-display-heading text-[11px] font-bold uppercase tracking-[0.14em] text-[#1a1a1a]">
      <span className="inline-block border-l-[3px] border-[#ff6600] pl-2.5">{children}</span>
    </h2>
  );
}

function KeyValueGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="ereport-kv mt-3 grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-md border border-[#e8e4df] bg-[#faf9f7] px-3 py-2.5"
        >
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6560]">
            {row.label}
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-[#141312]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChecklistTable({
  items,
}: {
  items: {
    label: string;
    checked: boolean;
    assignee?: string;
    comment?: string;
    estimatedCost?: string;
  }[];
}) {
  return (
    <ul className="ereport-checklist mt-3 space-y-1.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex gap-2 rounded-md border border-[#ece8e3] px-3 py-2 text-sm text-[#1c1b1a]"
        >
          <span className="shrink-0 font-mono text-xs leading-5 text-[#ff6600]">
            {item.checked ? "✓" : "○"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.label}</p>
            {(item.assignee || item.comment || item.estimatedCost) && (
              <p className="mt-0.5 text-xs text-[#6b6560]">
                {[item.assignee, item.estimatedCost, item.comment]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderSection(
  section: EventReportSection,
  imageUrls: Record<string, string>
): React.ReactNode {
  switch (section.id) {
    case "overview":
      return (
        <section key={section.id} className="ereport-section break-inside-avoid">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <KeyValueGrid rows={section.rows} />
        </section>
      );
    case "description":
      return (
        <section key={section.id} className="ereport-section break-inside-avoid">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <p className="ereport-body mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#2b2926]">
            {section.body}
          </p>
        </section>
      );
    case "goals":
      return (
        <section key={section.id} className="ereport-section break-inside-avoid">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <div className="mt-3 space-y-3">
            {section.goals ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6560]">
                  Goals
                </p>
                <p className="ereport-body mt-1 whitespace-pre-wrap text-sm text-[#2b2926]">
                  {section.goals}
                </p>
              </div>
            ) : null}
            {section.coreActivities ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6560]">
                  Core activities
                </p>
                <p className="ereport-body mt-1 whitespace-pre-wrap text-sm text-[#2b2926]">
                  {section.coreActivities}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      );
    case "schedule":
      return (
        <section key={section.id} className="ereport-section">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          {section.groups.map((group) => (
            <div key={group.heading} className="mt-4 break-inside-avoid">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#403c36]">
                {group.heading}
              </h3>
              <ChecklistTable items={group.items} />
            </div>
          ))}
        </section>
      );
    case "staffing":
      return (
        <section key={section.id} className="ereport-section break-inside-avoid">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <KeyValueGrid rows={section.rows} />
        </section>
      );
    case "vendors":
    case "sponsors":
      return (
        <section key={section.id} className="ereport-section">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#e0dcd6]">
            <table className="ereport-table w-full text-sm">
              <thead>
                <tr className="bg-[#f3f1ed] text-left text-[10px] font-semibold uppercase tracking-wide text-[#6b6560]">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Fee</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={`${row.name}-${row.role}`} className="border-t border-[#ece8e3]">
                    <td className="px-3 py-2 font-medium text-[#141312]">
                      {row.name}
                      {row.contact ? (
                        <span className="block text-xs font-normal text-[#6b6560]">
                          {row.contact}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[#403c36]">{row.role}</td>
                    <td className="px-3 py-2 text-[#403c36]">{row.status}</td>
                    <td className="hidden px-3 py-2 tabular-nums sm:table-cell">
                      {row.fee ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    case "budget":
      return (
        <section key={section.id} className="ereport-section">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          {section.rows.length > 0 ? <KeyValueGrid rows={section.rows} /> : null}
          {section.lineItems.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-[#e0dcd6]">
              <table className="ereport-table w-full text-sm">
                <thead>
                  <tr className="bg-[#f3f1ed] text-left text-[10px] font-semibold uppercase tracking-wide text-[#6b6560]">
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {section.lineItems.map((row, i) => (
                    <tr key={`${row.name}-${i}`} className="border-t border-[#ece8e3]">
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2 text-[#403c36]">{row.description ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.cost ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      );
    case "kpis":
      return (
        <section key={section.id} className="ereport-section break-inside-avoid">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          {section.highlight ? (
            <p className="mt-3 rounded-md border border-[#ff6600]/25 bg-[#fff4eb] px-3 py-2 text-sm text-[#5c3d1e]">
              {section.highlight}
            </p>
          ) : null}
          <KeyValueGrid rows={section.rows} />
        </section>
      );
    case "marketing":
      return (
        <section key={section.id} className="ereport-section">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <div className="mt-3 space-y-4">
            {section.blocks.map((block) => (
              <div
                key={block.heading}
                className="break-inside-avoid rounded-md border border-[#ece8e3] bg-[#faf9f7] p-3"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#403c36]">
                  {block.heading}
                </h3>
                <p className="ereport-body mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#2b2926]">
                  {block.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      );
    case "logistics":
      return (
        <section key={section.id} className="ereport-section">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          {section.rows.length > 0 ? <KeyValueGrid rows={section.rows} /> : null}
          {section.materials.length > 0 ? (
            <ChecklistTable items={section.materials} />
          ) : null}
        </section>
      );
    case "safety":
      return (
        <section key={section.id} className="ereport-section break-inside-avoid">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <ul className="ereport-list mt-3 list-disc space-y-1 pl-5 text-sm text-[#2b2926]">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      );
    case "materials":
      return (
        <section key={section.id} className="ereport-section">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <ChecklistTable items={section.items} />
        </section>
      );
    case "swapMeet":
      return (
        <section key={section.id} className="ereport-section break-inside-avoid">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#e0dcd6]">
            <table className="ereport-table w-full text-sm">
              <thead>
                <tr className="bg-[#f3f1ed] text-left text-[10px] font-semibold uppercase tracking-wide text-[#6b6560]">
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Contact</th>
                </tr>
              </thead>
              <tbody>
                {section.spots.map((spot) => (
                  <tr key={`${spot.name}-${spot.size}`} className="border-t border-[#ece8e3]">
                    <td className="px-3 py-2 font-medium">{spot.name}</td>
                    <td className="px-3 py-2">{spot.size}</td>
                    <td className="px-3 py-2">{spot.contact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    case "notes":
      return (
        <section key={section.id} className="ereport-section break-inside-avoid">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <div className="mt-3 space-y-3">
            {section.planning ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6560]">
                  Planning notes
                </p>
                <p className="ereport-body mt-1 whitespace-pre-wrap text-sm text-[#2b2926]">
                  {section.planning}
                </p>
              </div>
            ) : null}
            {section.recap ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6560]">
                  Recap
                </p>
                <p className="ereport-body mt-1 whitespace-pre-wrap text-sm text-[#2b2926]">
                  {section.recap}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      );
    case "images":
      return (
        <section key={section.id} className="ereport-section">
          <ReportSectionHeading>{section.title}</ReportSectionHeading>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {section.images.map((img) => {
              const url = imageUrls[img.mediaId];
              return (
                <figure
                  key={img.mediaId}
                  className="break-inside-avoid overflow-hidden rounded-lg border border-[#e0dcd6] bg-[#faf9f7]"
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URLs for print/PDF
                    <img
                      src={url}
                      alt=""
                      className="ereport-image max-h-64 w-full object-contain bg-white p-2"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-[#6b6560]">
                      Image unavailable
                    </div>
                  )}
                  <figcaption className="border-t border-[#ece8e3] px-3 py-2 text-xs text-[#403c36]">
                    {img.caption}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      );
    default:
      return null;
  }
}

export function EventReportDocument({
  model,
  imageUrls,
}: {
  model: EventReportModel;
  imageUrls: Record<string, string>;
}) {
  let generatedLabel = "—";
  try {
    generatedLabel = format(parseISO(model.generatedAtIso), "MMMM d, yyyy · h:mm a");
  } catch {
    generatedLabel = model.generatedAtIso;
  }

  return (
    <article className="event-report-print bg-white text-[#141312] ring-1 ring-[#e8e4df]">
      <header className="ereport-cover relative overflow-hidden border-b border-[#e8e4df] bg-gradient-to-br from-[#141312] via-[#1f1d1b] to-[#2b2926] px-6 py-10 text-white sm:px-10 sm:py-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/MKElogo.png"
          alt="Milwaukee Harley-Davidson"
          className="ereport-header-logo pointer-events-none absolute right-6 top-6 z-10 h-auto w-auto max-h-[8.5rem] max-w-[15rem] object-contain sm:right-10 sm:top-8"
          width={416}
          height={136}
          decoding="async"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-12deg, transparent, transparent 18px, rgba(255,102,0,0.35) 18px, rgba(255,102,0,0.35) 19px)",
          }}
          aria-hidden
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff8533]">
            {model.organizationName ?? "Event operations"}
          </p>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
            Executive event report
          </p>
          <h1 className="font-display-heading mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {model.eventTitle}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="rounded-full bg-[#ff6600]/20 px-3 py-1 text-[#ffb380] ring-1 ring-[#ff6600]/35">
              {model.eventStatusLabel}
            </span>
            {model.eventTypeLabel ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-white/80 ring-1 ring-white/15">
                {model.eventTypeLabel}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="ereport-body px-6 py-8 sm:px-10 sm:py-10">
        {model.sections.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#d8d2cb] bg-[#faf9f7] px-4 py-8 text-center text-sm text-[#6b6560]">
            No report sections yet — add event details, checklist progress, vendors, or
            marketing content on the event page, then return here.
          </p>
        ) : (
          <div className="space-y-10">{model.sections.map((s) => renderSection(s, imageUrls))}</div>
        )}
      </div>

      <footer className="ereport-footer border-t border-[#e8e4df] bg-[#faf9f7] px-6 py-4 text-center text-[10px] uppercase tracking-[0.12em] text-[#6b6560] sm:px-10">
        Generated {generatedLabel}
        {model.organizationName ? ` · ${model.organizationName}` : ""}
      </footer>
    </article>
  );
}
