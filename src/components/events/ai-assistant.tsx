"use client";

import { useState, useCallback } from "react";
import { Event } from "@/types/database";
import {
  generateMarketingPlan,
  generateSocialPosts,
  generateEmailCampaigns,
  generateEventDescriptions,
  regenerateSocialPostAtIndex,
  regenerateEmailCampaignAtIndex,
  regenerateEventDescriptionAtIndex,
  type MarketingPlan,
  type SocialPostDraft,
  type EmailCampaignDraft,
  type EventDescriptionDraft,
} from "@/lib/ai-generate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Mail,
  FileText,
  RefreshCw,
  Share2,
} from "lucide-react";

interface AiAssistantProps {
  event: Event;
}

type LoadingKey = null | "all" | "social" | "email" | "descriptions";

const textareaClass =
  "w-full min-h-[100px] px-3 py-2.5 rounded-lg bg-harley-black/40 border border-harley-gray-lighter/40 text-harley-text text-sm leading-relaxed placeholder-harley-text-muted/50 focus:outline-none focus:border-harley-orange/60 focus:ring-1 focus:ring-harley-orange/25 resize-y";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-harley-black/40 border border-harley-gray-lighter/40 text-harley-text text-sm focus:outline-none focus:border-harley-orange/60 focus:ring-1 focus:ring-harley-orange/25";

export function AiAssistant({ event }: AiAssistantProps) {
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState<LoadingKey>(null);
  /** Stable row id while a single card is regenerating (preserves React keys). */
  const [itemLoadingId, setItemLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  async function handleGenerateAll() {
    setLoading("all");
    try {
      const result = await generateMarketingPlan(event);
      setPlan(result);
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleRegenerateSocial() {
    setLoading("social");
    try {
      const socialPosts = await generateSocialPosts(event);
      setPlan((p) =>
        p ? { ...p, socialPosts } : { socialPosts, emailCampaigns: [], eventDescriptions: [] }
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  async function handleRegenerateEmails() {
    setLoading("email");
    try {
      const emailCampaigns = await generateEmailCampaigns(event);
      setPlan((p) =>
        p
          ? { ...p, emailCampaigns }
          : { socialPosts: [], emailCampaigns, eventDescriptions: [] }
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  async function handleRegenerateDescriptions() {
    setLoading("descriptions");
    try {
      const eventDescriptions = await generateEventDescriptions(event);
      setPlan((p) =>
        p
          ? { ...p, eventDescriptions }
          : { socialPosts: [], emailCampaigns: [], eventDescriptions }
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  function updateSocialPost(id: string, content: string) {
    setPlan((p) =>
      p
        ? {
            ...p,
            socialPosts: p.socialPosts.map((sp) =>
              sp.id === id ? { ...sp, content } : sp
            ),
          }
        : p
    );
  }

  function updateEmail(
    id: string,
    field: "subject" | "body",
    value: string
  ) {
    setPlan((p) =>
      p
        ? {
            ...p,
            emailCampaigns: p.emailCampaigns.map((em) =>
              em.id === id ? { ...em, [field]: value } : em
            ),
          }
        : p
    );
  }

  function updateDescription(id: string, content: string) {
    setPlan((p) =>
      p
        ? {
            ...p,
            eventDescriptions: p.eventDescriptions.map((d) =>
              d.id === id ? { ...d, content } : d
            ),
          }
        : p
    );
  }

  async function handleRegenerateOneSocial(id: string) {
    if (!plan) return;
    const idx = plan.socialPosts.findIndex((p) => p.id === id);
    if (idx < 0) return;
    setItemLoadingId(id);
    try {
      const next = await regenerateSocialPostAtIndex(event, idx);
      setPlan((p) =>
        p
          ? {
              ...p,
              socialPosts: p.socialPosts.map((sp) =>
                sp.id === id ? { ...sp, ...next } : sp
              ),
            }
          : p
      );
    } catch (err) {
      console.error(err);
    } finally {
      setItemLoadingId(null);
    }
  }

  async function handleRegenerateOneEmail(id: string) {
    if (!plan) return;
    const idx = plan.emailCampaigns.findIndex((e) => e.id === id);
    if (idx < 0) return;
    setItemLoadingId(id);
    try {
      const next = await regenerateEmailCampaignAtIndex(event, idx);
      setPlan((p) =>
        p
          ? {
              ...p,
              emailCampaigns: p.emailCampaigns.map((em) =>
                em.id === id ? { ...em, ...next } : em
              ),
            }
          : p
      );
    } catch (err) {
      console.error(err);
    } finally {
      setItemLoadingId(null);
    }
  }

  async function handleRegenerateOneDescription(id: string) {
    if (!plan) return;
    const idx = plan.eventDescriptions.findIndex((d) => d.id === id);
    if (idx < 0) return;
    setItemLoadingId(id);
    try {
      const next = await regenerateEventDescriptionAtIndex(event, idx);
      setPlan((p) =>
        p
          ? {
              ...p,
              eventDescriptions: p.eventDescriptions.map((d) =>
                d.id === id ? { ...d, ...next } : d
              ),
            }
          : p
      );
    } catch (err) {
      console.error(err);
    } finally {
      setItemLoadingId(null);
    }
  }

  const platformColor: Record<string, "orange" | "default" | "muted"> = {
    Instagram: "orange",
    Facebook: "muted",
    "X / Twitter": "default",
    LinkedIn: "muted",
    "TikTok / Reels caption": "orange",
  };

  const busyAll = loading === "all";
  const busySocial = loading === "social" || busyAll;
  const busyEmail = loading === "email" || busyAll;
  const busyDesc = loading === "descriptions" || busyAll;
  const itemBusyGlobal = itemLoadingId !== null;

  return (
    <Card className="!p-3.5 md:!p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-harley-orange" />
          <div>
            <h3 className="font-semibold text-harley-text">AI Assistant</h3>
            <p className="text-xs text-harley-text-muted mt-0.5">
              Social posts, email ideas, and event descriptions — edit and copy anything.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {plan && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateAll}
              disabled={busyAll}
            >
              {busyAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate all
            </Button>
          )}
        </div>
      </div>

      {!plan && (
        <div className="text-center py-6">
          <p className="text-sm text-harley-text-muted mb-4 max-w-md mx-auto">
            Generate <strong>multiple</strong> social posts, <strong>several</strong> email
            campaign ideas, and <strong>several</strong> event description variants. Everything
            stays editable before you copy.
          </p>
          <Button onClick={handleGenerateAll} disabled={busyAll}>
            {busyAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate content pack
          </Button>
        </div>
      )}

      {plan && (
        <div className="space-y-8">
          {/* Social */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold text-harley-text flex items-center gap-2">
                <Share2 className="w-4 h-4 text-harley-orange" />
                Social post generator
              </h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerateSocial}
                disabled={busySocial}
                className="shrink-0"
              >
                {busySocial && loading === "social" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate posts
              </Button>
            </div>
            <p className="text-xs text-harley-text-muted mb-3">
              {plan.socialPosts.length} posts · tweak copy below, then copy each block.
            </p>
            <div className="space-y-3">
              {plan.socialPosts.map((post) => (
                <SocialPostEditor
                  key={post.id}
                  post={post}
                  platformColor={platformColor}
                  disabled={busySocial || itemLoadingId === post.id}
                  regenDisabled={
                    busySocial || (itemBusyGlobal && itemLoadingId !== post.id)
                  }
                  regenLoading={itemLoadingId === post.id}
                  textareaClass={textareaClass}
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                  onChangeContent={(c) => updateSocialPost(post.id, c)}
                  onRegenerate={() => handleRegenerateOneSocial(post.id)}
                />
              ))}
            </div>
          </section>

          {/* Email */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold text-harley-text flex items-center gap-2">
                <Mail className="w-4 h-4 text-harley-text-muted" />
                Email campaign ideas
              </h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerateEmails}
                disabled={busyEmail}
                className="shrink-0"
              >
                {busyEmail && loading === "email" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate emails
              </Button>
            </div>
            <p className="text-xs text-harley-text-muted mb-3">
              {plan.emailCampaigns.length} angles (announcement, reminder, urgency, insider).
            </p>
            <div className="space-y-4">
              {plan.emailCampaigns.map((em) => (
                <EmailCampaignEditor
                  key={em.id}
                  campaign={em}
                  disabled={busyEmail || itemLoadingId === em.id}
                  regenDisabled={
                    busyEmail || (itemBusyGlobal && itemLoadingId !== em.id)
                  }
                  regenLoading={itemLoadingId === em.id}
                  inputClass={inputClass}
                  textareaClass={textareaClass}
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                  onChangeSubject={(v) => updateEmail(em.id, "subject", v)}
                  onChangeBody={(v) => updateEmail(em.id, "body", v)}
                  onRegenerate={() => handleRegenerateOneEmail(em.id)}
                />
              ))}
            </div>
          </section>

          {/* Descriptions */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold text-harley-text flex items-center gap-2">
                <FileText className="w-4 h-4 text-harley-text-muted" />
                Event description generator
              </h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerateDescriptions}
                disabled={busyDesc}
                className="shrink-0"
              >
                {busyDesc && loading === "descriptions" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate descriptions
              </Button>
            </div>
            <p className="text-xs text-harley-text-muted mb-3">
              Short, standard, long, and SEO-style — pick one or mix and match.
            </p>
            <div className="space-y-3">
              {plan.eventDescriptions.map((d) => (
                <DescriptionEditor
                  key={d.id}
                  draft={d}
                  disabled={busyDesc || itemLoadingId === d.id}
                  regenDisabled={
                    busyDesc || (itemBusyGlobal && itemLoadingId !== d.id)
                  }
                  regenLoading={itemLoadingId === d.id}
                  textareaClass={textareaClass}
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                  onChangeContent={(c) => updateDescription(d.id, c)}
                  onRegenerate={() => handleRegenerateOneDescription(d.id)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </Card>
  );
}

function SocialPostEditor({
  post,
  platformColor,
  disabled,
  regenDisabled,
  regenLoading,
  textareaClass,
  copiedId,
  onCopy,
  onChangeContent,
  onRegenerate,
}: {
  post: SocialPostDraft;
  platformColor: Record<string, "orange" | "default" | "muted">;
  disabled: boolean;
  regenDisabled: boolean;
  regenLoading: boolean;
  textareaClass: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onChangeContent: (c: string) => void;
  onRegenerate: () => void;
}) {
  const copyId = `social-${post.id}`;
  const isCopied = copiedId === copyId;
  return (
    <div className="bg-harley-gray/50 rounded-lg p-3 md:p-4 border border-harley-gray">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Badge variant={platformColor[post.platform] || "default"}>
            {post.platform}
          </Badge>
          <span className="text-[11px] text-harley-text-muted">{post.angle}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenDisabled || regenLoading}
            className="flex items-center gap-1 text-xs text-harley-text-muted hover:text-harley-orange transition-colors disabled:opacity-50 px-1.5 py-1 rounded-md hover:bg-harley-black/20"
            aria-busy={regenLoading}
          >
            {regenLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => onCopy(post.content, copyId)}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-harley-text-muted hover:text-harley-orange transition-colors disabled:opacity-50 px-1.5 py-1 rounded-md hover:bg-harley-black/20"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-harley-success" />
                <span className="text-harley-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <textarea
        value={post.content}
        onChange={(e) => onChangeContent(e.target.value)}
        disabled={disabled}
        className={textareaClass}
        rows={5}
        aria-label={`${post.platform} post`}
      />
    </div>
  );
}

function EmailCampaignEditor({
  campaign,
  disabled,
  regenDisabled,
  regenLoading,
  inputClass,
  textareaClass,
  copiedId,
  onCopy,
  onChangeSubject,
  onChangeBody,
  onRegenerate,
}: {
  campaign: EmailCampaignDraft;
  disabled: boolean;
  regenDisabled: boolean;
  regenLoading: boolean;
  inputClass: string;
  textareaClass: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onChangeSubject: (v: string) => void;
  onChangeBody: (v: string) => void;
  onRegenerate: () => void;
}) {
  const copyId = `email-${campaign.id}`;
  const isCopied = copiedId === copyId;
  const fullText = `Subject: ${campaign.subject}\n\n${campaign.body}`;
  return (
    <div className="bg-harley-gray/50 rounded-lg p-3 md:p-4 border border-harley-gray space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-harley-text min-w-0 flex-1">
          {campaign.title}
        </p>
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenDisabled || regenLoading}
            className="flex items-center gap-1 text-xs text-harley-text-muted hover:text-harley-orange transition-colors disabled:opacity-50 px-1.5 py-1 rounded-md hover:bg-harley-black/20"
            aria-busy={regenLoading}
          >
            {regenLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => onCopy(fullText, copyId)}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-harley-text-muted hover:text-harley-orange transition-colors disabled:opacity-50 px-1.5 py-1 rounded-md hover:bg-harley-black/20"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-harley-success" />
                <span className="text-harley-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy full email
              </>
            )}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
          Subject line
        </label>
        <input
          type="text"
          value={campaign.subject}
          onChange={(e) => onChangeSubject(e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
          Body
        </label>
        <textarea
          value={campaign.body}
          onChange={(e) => onChangeBody(e.target.value)}
          disabled={disabled}
          className={textareaClass}
          rows={8}
        />
      </div>
    </div>
  );
}

function DescriptionEditor({
  draft,
  disabled,
  regenDisabled,
  regenLoading,
  textareaClass,
  copiedId,
  onCopy,
  onChangeContent,
  onRegenerate,
}: {
  draft: EventDescriptionDraft;
  disabled: boolean;
  regenDisabled: boolean;
  regenLoading: boolean;
  textareaClass: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onChangeContent: (c: string) => void;
  onRegenerate: () => void;
}) {
  const copyId = `desc-${draft.id}`;
  const isCopied = copiedId === copyId;
  return (
    <div className="bg-harley-gray/50 rounded-lg p-3 md:p-4 border border-harley-gray">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-harley-orange min-w-0 flex-1">
          {draft.label}
        </span>
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenDisabled || regenLoading}
            className="flex items-center gap-1 text-xs text-harley-text-muted hover:text-harley-orange transition-colors disabled:opacity-50 px-1.5 py-1 rounded-md hover:bg-harley-black/20"
            aria-busy={regenLoading}
          >
            {regenLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => onCopy(draft.content, copyId)}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-harley-text-muted hover:text-harley-orange transition-colors disabled:opacity-50 px-1.5 py-1 rounded-md hover:bg-harley-black/20"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-harley-success" />
                <span className="text-harley-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <textarea
        value={draft.content}
        onChange={(e) => onChangeContent(e.target.value)}
        disabled={disabled}
        className={textareaClass}
        rows={4}
        aria-label={draft.label}
      />
    </div>
  );
}
