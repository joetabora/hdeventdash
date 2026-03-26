"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createEvent } from "@/lib/events";
import { EventForm } from "@/components/events/event-form";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useAppRole } from "@/contexts/app-role-context";

export default function NewEventPage() {
  const router = useRouter();
  const { canManageEvents, loading: roleLoading } = useAppRole();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabaseRef.current?.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (roleLoading) return;
    if (!canManageEvents) router.replace("/dashboard");
  }, [roleLoading, canManageEvents, router]);

  async function handleCreate(data: {
    name: string;
    date: string;
    location: string;
    owner: string;
    status: string;
    description: string;
    onedrive_link: string;
  }) {
    if (!userId || !supabaseRef.current)
      throw new Error("Not authenticated");
    const event = await createEvent(supabaseRef.current, {
      ...data,
      status: data.status as "idea",
      user_id: userId,
      onedrive_link: data.onedrive_link || undefined,
    });
    router.push(`/events/${event.id}`);
  }

  if (roleLoading || !canManageEvents) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <Card padding="lg">
        <EventForm
          onSubmit={handleCreate}
          onCancel={() => router.push("/dashboard")}
        />
      </Card>
    </div>
  );
}
