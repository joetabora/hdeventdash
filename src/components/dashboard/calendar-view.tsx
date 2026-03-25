"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { Event } from "@/types/database";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface CalendarViewProps {
  events: Event[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach((event) => {
      const key = event.date;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [events]);

  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-6 py-4 border-b border-harley-gray">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-harley-gray rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-harley-text-muted" />
        </button>
        <h2 className="text-lg font-semibold text-harley-text">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-harley-gray rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-harley-text-muted" />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-medium text-harley-text-muted border-b border-harley-gray"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateKey}
              className={`min-h-[100px] p-2 border-b border-r border-harley-gray ${
                !isCurrentMonth ? "opacity-30" : ""
              }`}
            >
              <div
                className={`text-xs mb-1 ${
                  isToday
                    ? "w-6 h-6 flex items-center justify-center rounded-full bg-harley-orange text-white font-bold"
                    : "text-harley-text-muted"
                }`}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block text-xs p-1 rounded bg-harley-orange/15 text-harley-orange truncate hover:bg-harley-orange/25 transition-colors"
                  >
                    {event.name}
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-xs text-harley-text-muted">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
