"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createEvent } from "@/lib/events";
import { EventForm } from "@/components/events/event-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

export default function NewEventPage() {
  const router = useRouter();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabaseRef.current?.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

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

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-harley-text-muted hover:text-harley-orange mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="bg-harley-dark rounded-xl border border-harley-gray p-6">
        <EventForm
          onSubmit={handleCreate}
          onCancel={() => router.push("/dashboard")}
        />
      </div>
    </div>
  );
}
