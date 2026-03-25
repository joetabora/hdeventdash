"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEvents, updateEvent } from "@/lib/events";
import { Event, EventStatus } from "@/types/database";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { ListView } from "@/components/dashboard/list-view";
import { Filters } from "@/components/dashboard/filters";
import { LayoutGrid, Calendar, List, Loader2 } from "lucide-react";

type ViewType = "kanban" | "calendar" | "list";

export function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );

  const viewParam = searchParams.get("view") as ViewType | null;
  const currentView: ViewType = viewParam || "kanban";

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  const loadEvents = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      const data = await getEvents(supabase);
      setEvents(data.filter((e) => !e.is_archived));
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !search ||
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        event.description.toLowerCase().includes(search.toLowerCase());
      const matchesLocation =
        !locationFilter || event.location === locationFilter;
      const matchesOwner = !ownerFilter || event.owner === ownerFilter;
      return matchesSearch && matchesLocation && matchesOwner;
    });
  }, [events, search, locationFilter, ownerFilter]);

  async function handleStatusChange(eventId: string, newStatus: EventStatus) {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
    );
    try {
      await updateEvent(supabase, eventId, { status: newStatus });
    } catch {
      loadEvents();
    }
  }

  function setView(view: ViewType) {
    if (view === "kanban") {
      router.push("/dashboard");
    } else {
      router.push(`/dashboard?view=${view}`);
    }
  }

  const viewButtons: { id: ViewType; label: string; icon: typeof LayoutGrid }[] = [
    { id: "kanban", label: "Kanban", icon: LayoutGrid },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "list", label: "List", icon: List },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-harley-text">Events Dashboard</h1>
        <div className="flex items-center bg-harley-dark rounded-lg border border-harley-gray p-1">
          {viewButtons.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentView === id
                  ? "bg-harley-orange text-white"
                  : "text-harley-text-muted hover:text-harley-text"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Filters
        events={events}
        search={search}
        onSearchChange={setSearch}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={setOwnerFilter}
      />

      {currentView === "kanban" && (
        <KanbanBoard
          events={filteredEvents}
          onStatusChange={handleStatusChange}
        />
      )}
      {currentView === "calendar" && (
        <CalendarView events={filteredEvents} />
      )}
      {currentView === "list" && <ListView events={filteredEvents} />}
    </div>
  );
}
