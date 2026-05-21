"use client";

import { useState } from "react";
import { AI_TEMPLATE_IDS } from "@/lib/ai/prompt-templates/ids";
import {
  MARKETING_PLATFORM_OPTIONS,
  MARKETING_TONES,
  MARKETING_COPY_LENGTHS,
} from "@/lib/ai/marketing-prompt/constants";
import {
  DEFAULT_MARKETING_TOGGLES,
  type MarketingCopyLength,
  type MarketingPlatform,
  type MarketingToggleOptions,
  type MarketingTone,
} from "@/lib/ai/marketing-prompt/types";
import { buildCopyDevelopmentAiBriefing } from "@/lib/new-event-playbook-copy";
import { useAiCompletion } from "@/hooks/use-ai-completion";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Copy, Loader2, Sparkles } from "lucide-react";

export type CopyPromptFields = {
  event_name?: string | null;
  event_date_text?: string | null;
  location?: string | null;
  who_its_for?: string | null;
  food?: string | null;
  entertainment?: string | null;
  perks_discounts?: string | null;
  tone?: string | null;
  phrases?: string | null;
  rsvp_notes?: string | null;
};

type ToggleKey = keyof MarketingToggleOptions;

const TOGGLE_OPTIONS: { key: ToggleKey; label: string }[] = [
  { key: "moreEmojis", label: "More emojis" },
  { key: "moreSeoFocus", label: "More SEO focus" },
  { key: "moreEngagement", label: "More engagement" },
  { key: "shorterCopy", label: "Shorter copy" },
  { key: "longerCopy", label: "Longer copy" },
  { key: "strongerCta", label: "Stronger CTA" },
  { key: "moreProfessional", label: "More professional" },
  { key: "moreHype", label: "More hype" },
];

function briefingFromFields(fields: CopyPromptFields): string {
  return buildCopyDevelopmentAiBriefing(fields);
}

function hasMinimumBriefing(fields: CopyPromptFields): boolean {
  const b = briefingFromFields(fields);
  return b.trim().length >= 40;
}

export function MarketingCopyGenerator({
  copyPromptFields,
}: {
  copyPromptFields: CopyPromptFields;
}) {
  const ai = useAiCompletion();
  const [platform, setPlatform] = useState<MarketingPlatform>("facebook_post");
  const [tone, setTone] = useState<MarketingTone>("hype");
  const [copyLength, setCopyLength] = useState<MarketingCopyLength>("standard");
  const [variationCount, setVariationCount] = useState<"1" | "2" | "3">("1");
  const [toggles, setToggles] = useState<MarketingToggleOptions>({
    ...DEFAULT_MARKETING_TOGGLES,
  });
  const [copied, setCopied] = useState(false);

  const canGenerate = hasMinimumBriefing(copyPromptFields);

  function patchToggle(key: ToggleKey, checked: boolean) {
    setToggles((prev) => ({ ...prev, [key]: checked }));
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    await ai.run("/api/ai/complete", {
      templateId: AI_TEMPLATE_IDS.PLAYBOOK_MARKETING_ASSISTANT,
      variables: {
        briefing: briefingFromFields(copyPromptFields),
        platform,
        tone,
        copyLength,
        variationCount: Number(variationCount) as 1 | 2 | 3,
        options: toggles,
      },
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-harley-orange/40 bg-harley-black/25 p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-harley-orange flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          AI marketing assistant
        </p>
        <p className="text-xs text-harley-text-muted leading-relaxed">
          Platform-aware copy with tone presets, SEO guidance, and natural emojis.
          Fill in the copy development fields above first.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as MarketingPlatform)}
          options={MARKETING_PLATFORM_OPTIONS.map((p) => ({
            value: p.value,
            label: p.label,
          }))}
        />
        <Select
          label="Tone"
          value={tone}
          onChange={(e) => setTone(e.target.value as MarketingTone)}
          options={MARKETING_TONES}
        />
        <Select
          label="Copy length"
          value={copyLength}
          onChange={(e) =>
            setCopyLength(e.target.value as MarketingCopyLength)
          }
          options={MARKETING_COPY_LENGTHS}
        />
        <Select
          label="Variations"
          value={variationCount}
          onChange={(e) => setVariationCount(e.target.value as "1" | "2" | "3")}
          options={[
            { value: "1", label: "1 variation" },
            { value: "2", label: "2 variations" },
            { value: "3", label: "3 variations" },
          ]}
        />
      </div>

      <div>
        <p className="text-xs text-harley-text-muted mb-2">Enhancements</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TOGGLE_OPTIONS.map(({ key, label }) => (
            <label
              key={key}
              className="inline-flex items-center gap-2 text-sm text-harley-text cursor-pointer"
            >
              <input
                type="checkbox"
                checked={toggles[key]}
                onChange={(e) => patchToggle(key, e.target.checked)}
                className="rounded border-harley-gray-lighter text-harley-orange focus:ring-harley-orange/30"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {!canGenerate && (
        <p className="text-xs text-harley-warning">
          Add event name and a few copy fields above (minimum briefing length)
          before generating.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={!canGenerate || ai.status === "loading"}
          onClick={() => void handleGenerate()}
        >
          {ai.status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate copy
            </>
          )}
        </Button>
      </div>

      {ai.status === "loading" ? (
        <p className="text-[11px] text-harley-text-muted leading-relaxed">
          Running Ollama — social modes use higher creativity; SEO modes stay
          tighter. Increase{" "}
          <code className="text-[10px] px-1 rounded bg-harley-black/60">
            AI_REQUEST_TIMEOUT_MS
          </code>{" "}
          if needed.
        </p>
      ) : null}

      {ai.error ? (
        <p className="text-xs text-red-400">{ai.error}</p>
      ) : null}

      {ai.status === "success" && ai.data?.text ? (
        <div className="rounded-lg border border-harley-gray/40 bg-harley-black/40 p-3 space-y-2">
          <div className="flex flex-wrap justify-between gap-2 items-center">
            <p className="text-xs font-semibold text-harley-text">
              AI draft
              {ai.data.templateVersion ? (
                <span className="text-harley-text-muted font-normal ml-2">
                  v{ai.data.templateVersion}
                </span>
              ) : null}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const text = ai.data?.text;
                if (!text) return;
                void navigator.clipboard.writeText(text).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="text-sm text-harley-text whitespace-pre-wrap font-sans leading-relaxed max-h-[28rem] overflow-y-auto rounded-md bg-harley-black/50 p-3 border border-harley-gray/30 select-all">
            {ai.data.text}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
