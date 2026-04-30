"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiCreateEvent, apiUploadMedia } from "@/lib/events-api-client";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import {
  NewEventPlaybookForm,
  type NewEventPlaybookSubmitPayload,
} from "@/components/events/new-event-playbook-form";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { EventBudgetPeer } from "@/lib/budgets";

export function NewEventClient({
  initialBudgetPeers,
}: {
  initialBudgetPeers: EventBudgetPeer[];
}) {
  const router = useRouter();
  const [budgetPeers, setBudgetPeers] = useState(initialBudgetPeers);

  const onBudgetPeersMonthChange = useCallback((yearMonth: string) => {
    void (async () => {
      try {
        const data = await apiFetchJson<{ events: EventBudgetPeer[] }>(
          `/api/events/budget-context?month=${encodeURIComponent(yearMonth)}`
        );
        setBudgetPeers(data.events);
      } catch {
        setBudgetPeers([]);
      }
    })();
  }, []);

  const handleCreate = useCallback(
    async ({ body, webGraphicFile, pageBannerFile }: NewEventPlaybookSubmitPayload) => {
      const event = await apiCreateEvent(body);
      if (webGraphicFile) {
        await apiUploadMedia(event.id, webGraphicFile, "marketing_asset");
      }
      if (pageBannerFile) {
        await apiUploadMedia(event.id, pageBannerFile, "marketing_asset");
      }
      router.push(`/events/${event.id}`);
    },
    [router]
  );

  return (
    <div className="max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <Card padding="lg">
        <NewEventPlaybookForm
          allEvents={budgetPeers}
          onBudgetPeersMonthChange={onBudgetPeersMonthChange}
          onSubmit={handleCreate}
          onCancel={() => router.push("/dashboard")}
        />
      </Card>
    </div>
  );
}
