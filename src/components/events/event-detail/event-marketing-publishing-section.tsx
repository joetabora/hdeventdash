"use client";

import { useEffect, useMemo, useState } from "react";
import type { Event } from "@/types/database";
import {
  PLAYBOOK_MARKETING_ASSET_CATALOG,
  defaultPlaybookMarketing,
  effectiveArtRequestFormUrl,
  getPlaybookMarketing,
  mergeAssetRequestsWithCatalog,
  normalizePlaybookMarketingDates,
  type PlaybookMarketing,
} from "@/lib/playbook-marketing";
import { apiPatchEvent } from "@/lib/events-api-client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { CollapsibleSection } from "@/components/events/event-detail/collapsible-section";
import { ExternalLink, Loader2, Megaphone, Save } from "lucide-react";
import { showError, errorMessage } from "@/lib/toast";

const assetLabel = (key: string) =>
  PLAYBOOK_MARKETING_ASSET_CATALOG.find((a) => a.key === key)?.label ?? key;

function ymdStr(v: string | null | undefined): string {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return "";
}

export function EventMarketingPublishingSection({
  event,
  orgMarketingArtFormUrl,
  canEdit,
  onAfterSave,
  onGoToSupporting,
}: {
  event: Event;
  orgMarketingArtFormUrl: string | null;
  canEdit: boolean;
  onAfterSave: (e: Event) => void;
  onGoToSupporting?: () => void;
}) {
  const initial = useMemo(() => getPlaybookMarketing(event), [event]);

  const [draft, setDraft] = useState<PlaybookMarketing>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(getPlaybookMarketing(event));
  }, [event]);

  const artUrl = effectiveArtRequestFormUrl(event, orgMarketingArtFormUrl);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = normalizePlaybookMarketingDates({
        ...defaultPlaybookMarketing(),
        ...draft,
        asset_requests: mergeAssetRequestsWithCatalog(draft.asset_requests),
      });
      const updated = await apiPatchEvent(event.id, {
        playbook_marketing: payload,
      });
      onAfterSave(updated);
      setDraft(getPlaybookMarketing(updated));
    } catch (e) {
      console.error(e);
      showError(errorMessage(e, "Could not save marketing details."));
    } finally {
      setSaving(false);
    }
  }

  const assets = mergeAssetRequestsWithCatalog(draft.asset_requests);

  return (
    <CollapsibleSection
      icon={<Megaphone className="w-4.5 h-4.5" />}
      title="Marketing & publishing"
      defaultOpen={true}
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-harley-gray/40 bg-harley-black/25 p-3 text-sm text-harley-text-muted leading-relaxed">
          <p className="font-medium text-harley-text mb-1">Copy prompts</p>
          <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm">
            <li>
              Summarize the event for the website: who it is for, what happens,
              and the single clearest reason to attend.
            </li>
            <li>
              SEO title: dealer + event name + city; meta description: one
              sentence with date and primary keyword.
            </li>
            <li>
              Facebook event: lead with the hook, bullet core activities, then
              RSVP and parking details.
            </li>
          </ul>
          {onGoToSupporting ? (
            <button
              type="button"
              className="mt-2 text-xs text-harley-orange hover:underline"
              onClick={onGoToSupporting}
            >
              Open AI Assistant in Supporting →
            </button>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-medium text-harley-text-muted mb-1.5">
            Art request form
          </p>
          {artUrl ? (
            <a
              href={artUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-harley-orange hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Open form
            </a>
          ) : (
            <p className="text-sm text-harley-text-muted">
              Set a per-event URL below, or add{" "}
              <code className="text-xs text-harley-text">
                marketing_art_form_url
              </code>{" "}
              on your organization in Supabase for a default link.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Art request sent"
            disabled={!canEdit}
            type="date"
            value={ymdStr(draft.art_request_sent_at)}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                art_request_sent_at: e.target.value || null,
              }))
            }
          />
          <Input
            label="Art finals received"
            disabled={!canEdit}
            type="date"
            value={ymdStr(draft.art_finals_received_at)}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                art_finals_received_at: e.target.value || null,
              }))
            }
          />
          <Input
            label="PAM map approval"
            disabled={!canEdit}
            type="date"
            value={ymdStr(draft.pam_map_approval_at)}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                pam_map_approval_at: e.target.value || null,
              }))
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Per-event art form URL (optional)"
            disabled={!canEdit}
            value={draft.art_request_form_url ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                art_request_form_url: e.target.value.trim()
                  ? e.target.value
                  : null,
              }))
            }
            placeholder="https://…"
          />
          <div className="flex flex-col gap-2 justify-end pb-1">
            <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={draft.canva_web_banner_done ?? false}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    canva_web_banner_done: e.target.checked,
                  }))
                }
                className="rounded border-harley-gray"
              />
              Canva web banner done
            </label>
            <label className="flex items-center gap-2 text-sm text-harley-text cursor-pointer">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={draft.canva_fb_cover_done ?? false}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    canva_fb_cover_done: e.target.checked,
                  }))
                }
                className="rounded border-harley-gray"
              />
              Canva Facebook cover done
            </label>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-harley-text-muted mb-2">
            Asset requests
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {assets.map((row) => (
              <div
                key={row.key}
                className="flex gap-2 items-start rounded-lg border border-harley-gray/35 p-2.5 bg-harley-black/20"
              >
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={row.requested}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDraft((d) => ({
                      ...d,
                      asset_requests: mergeAssetRequestsWithCatalog(
                        d.asset_requests
                      ).map((r) =>
                        r.key === row.key ? { ...r, requested: checked } : r
                      ),
                    }));
                  }}
                  className="mt-1 rounded border-harley-gray shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-harley-text leading-snug">
                    {assetLabel(row.key)}
                  </p>
                  <input
                    disabled={!canEdit}
                    className="mt-1.5 w-full px-3 py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-xs placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70"
                    placeholder="Notes"
                    value={row.notes ?? ""}
                    onChange={(e) => {
                      const notes = e.target.value || null;
                      setDraft((d) => ({
                        ...d,
                        asset_requests: mergeAssetRequestsWithCatalog(
                          d.asset_requests
                        ).map((r) =>
                          r.key === row.key ? { ...r, notes } : r
                        ),
                      }));
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Textarea
            label="Web summary"
            disabled={!canEdit}
            rows={3}
            value={draft.web_summary ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, web_summary: e.target.value || null }))
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="SEO title"
              disabled={!canEdit}
              value={draft.seo_meta_title ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  seo_meta_title: e.target.value || null,
                }))
              }
            />
            <Input
              label="Public page URL"
              disabled={!canEdit}
              value={draft.web_page_url ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  web_page_url: e.target.value || null,
                }))
              }
              placeholder="https://…"
            />
          </div>
          <Textarea
            label="SEO meta description"
            disabled={!canEdit}
            rows={2}
            value={draft.seo_meta_description ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                seo_meta_description: e.target.value || null,
              }))
            }
          />
          <Textarea
            label="Facebook event copy"
            disabled={!canEdit}
            rows={4}
            value={draft.facebook_event_copy ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                facebook_event_copy: e.target.value || null,
              }))
            }
          />
        </div>

        {canEdit ? (
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save marketing & publishing
          </Button>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}
