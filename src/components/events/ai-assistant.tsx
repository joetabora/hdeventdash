"use client";

import { useState } from "react";
import { Event } from "@/types/database";
import { generateMarketingPlan, MarketingPlan } from "@/lib/ai-generate";
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
} from "lucide-react";

interface AiAssistantProps {
  event: Event;
}

export function AiAssistant({ event }: AiAssistantProps) {
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateMarketingPlan(event);
      setPlan(result);
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const platformColor: Record<string, "info" | "orange" | "default"> = {
    Instagram: "orange",
    Facebook: "info",
    "X / Twitter": "default",
  };

  return (
    <Card className="!p-3.5 md:!p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-harley-orange" />
          <h3 className="font-semibold text-harley-text">AI Assistant</h3>
        </div>
        {plan && (
          <Button variant="ghost" size="sm" onClick={handleGenerate}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
        )}
      </div>

      {!plan && (
        <div className="text-center py-6">
          <p className="text-sm text-harley-text-muted mb-4">
            Generate a marketing plan based on this event&apos;s details —
            social media posts, email campaign, and a polished description.
          </p>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate Marketing Plan
          </Button>
        </div>
      )}

      {loading && plan && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-harley-orange animate-spin" />
        </div>
      )}

      {plan && !loading && (
        <div className="space-y-5">
          {/* Social Posts */}
          <div>
            <h4 className="text-sm font-semibold text-harley-text mb-3 flex items-center gap-2">
              Social Media Posts
            </h4>
            <div className="space-y-3">
              {plan.socialPosts.map((post, i) => (
                <div
                  key={i}
                  className="bg-harley-gray/50 rounded-lg p-4 border border-harley-gray"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={platformColor[post.platform] || "default"}>
                      {post.platform}
                    </Badge>
                    <CopyButton
                      text={post.content}
                      id={`social-${i}`}
                      copiedId={copiedId}
                      onCopy={copyToClipboard}
                    />
                  </div>
                  <p className="text-sm text-harley-text whitespace-pre-line">
                    {post.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Email Campaign */}
          <div>
            <h4 className="text-sm font-semibold text-harley-text mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-harley-text-muted" />
              Email Campaign
            </h4>
            <div className="bg-harley-gray/50 rounded-lg p-4 border border-harley-gray">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-harley-text-muted">
                  Subject:{" "}
                  <span className="text-harley-text font-medium">
                    {plan.emailCampaign.subject}
                  </span>
                </p>
                <CopyButton
                  text={`Subject: ${plan.emailCampaign.subject}\n\n${plan.emailCampaign.body}`}
                  id="email"
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                />
              </div>
              <p className="text-sm text-harley-text whitespace-pre-line mt-2">
                {plan.emailCampaign.body}
              </p>
            </div>
          </div>

          {/* Event Description */}
          <div>
            <h4 className="text-sm font-semibold text-harley-text mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-harley-text-muted" />
              Event Description
            </h4>
            <div className="bg-harley-gray/50 rounded-lg p-4 border border-harley-gray">
              <div className="flex justify-end mb-1">
                <CopyButton
                  text={plan.eventDescription}
                  id="description"
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                />
              </div>
              <p className="text-sm text-harley-text">
                {plan.eventDescription}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function CopyButton({
  text,
  id,
  copiedId,
  onCopy,
}: {
  text: string;
  id: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const isCopied = copiedId === id;
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="flex items-center gap-1 text-xs text-harley-text-muted hover:text-harley-orange transition-colors"
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
  );
}
