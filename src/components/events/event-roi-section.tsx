"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateEvent } from "@/lib/events";
import type { Event } from "@/types/database";
import {
  formatUsd,
  hasAnyRoiData,
  netRoiProfit,
  roiMoneyVerdict,
  roiPercentOnCost,
  totalRoiRevenue,
} from "@/lib/event-roi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Save, Loader2, Users, Bike } from "lucide-react";

interface EventRoiSectionProps {
  event: Event;
  onUpdate: () => void;
  canEdit?: boolean;
}

function intStr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function moneyStr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function EventRoiSection({
  event,
  onUpdate,
  canEdit = true,
}: EventRoiSectionProps) {
  const [leads, setLeads] = useState(intStr(event.roi_leads_generated));
  const [bikesSold, setBikesSold] = useState(intStr(event.roi_bikes_sold));
  const [serviceRev, setServiceRev] = useState(moneyStr(event.roi_service_revenue));
  const [motorRev, setMotorRev] = useState(moneyStr(event.roi_motorclothes_revenue));
  const [bikeSalesRev, setBikeSalesRev] = useState(
    moneyStr(event.roi_bike_sales_revenue)
  );
  const [eventCost, setEventCost] = useState(moneyStr(event.roi_event_cost));
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setLeads(intStr(event.roi_leads_generated));
    setBikesSold(intStr(event.roi_bikes_sold));
    setServiceRev(moneyStr(event.roi_service_revenue));
    setMotorRev(moneyStr(event.roi_motorclothes_revenue));
    setBikeSalesRev(moneyStr(event.roi_bike_sales_revenue));
    setEventCost(moneyStr(event.roi_event_cost));
  }, [
    event.id,
    event.roi_leads_generated,
    event.roi_bikes_sold,
    event.roi_service_revenue,
    event.roi_motorclothes_revenue,
    event.roi_bike_sales_revenue,
    event.roi_event_cost,
  ]);

  const verdict = roiMoneyVerdict(event);
  const totalRev = totalRoiRevenue(event);
  const net = netRoiProfit(event);
  const roiPct = roiPercentOnCost(event);

  async function handleSave() {
    setSaving(true);
    try {
      await updateEvent(supabase, event.id, {
        roi_leads_generated: leads.trim() ? parseInt(leads, 10) : null,
        roi_bikes_sold: bikesSold.trim() ? parseInt(bikesSold, 10) : null,
        roi_service_revenue: serviceRev.trim() ? parseFloat(serviceRev) : null,
        roi_motorclothes_revenue: motorRev.trim() ? parseFloat(motorRev) : null,
        roi_bike_sales_revenue: bikeSalesRev.trim()
          ? parseFloat(bikeSalesRev)
          : null,
        roi_event_cost: eventCost.trim() ? parseFloat(eventCost) : null,
      });
      onUpdate();
    } catch (err) {
      console.error("Failed to save ROI:", err);
    } finally {
      setSaving(false);
    }
  }

  const toneClass =
    verdict.tone === "success"
      ? "text-harley-success border-harley-success/30 bg-harley-success/10"
      : verdict.tone === "danger"
        ? "text-harley-danger border-harley-danger/30 bg-harley-danger/10"
        : verdict.tone === "warning"
          ? "text-harley-orange border-harley-orange/30 bg-harley-orange/10"
          : "text-harley-text-muted border-harley-gray/40 bg-harley-gray-light/20";

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-80">
          Did this event make us money?
        </p>
        <p className="text-sm font-medium leading-snug">{verdict.label}</p>
      </div>

      {hasAnyRoiData(event) || totalRev > 0 || Number(event.roi_event_cost) > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="!p-3 border-harley-gray/50">
            <p className="text-[10px] uppercase tracking-wide text-harley-text-muted mb-0.5">
              Total revenue
            </p>
            <p className="text-lg font-bold text-harley-text tabular-nums">
              {formatUsd(totalRev)}
            </p>
          </Card>
          <Card className="!p-3 border-harley-gray/50">
            <p className="text-[10px] uppercase tracking-wide text-harley-text-muted mb-0.5">
              Est. cost
            </p>
            <p className="text-lg font-bold text-harley-text tabular-nums">
              {event.roi_event_cost != null && event.roi_event_cost > 0
                ? formatUsd(Number(event.roi_event_cost))
                : "—"}
            </p>
          </Card>
          <Card className="!p-3 border-harley-gray/50">
            <p className="text-[10px] uppercase tracking-wide text-harley-text-muted mb-0.5">
              Net (est.)
            </p>
            <p
              className={`text-lg font-bold tabular-nums ${
                net > 0
                  ? "text-harley-success"
                  : net < 0
                    ? "text-harley-danger"
                    : "text-harley-text"
              }`}
            >
              {Number(event.roi_event_cost) > 0 ? formatUsd(net) : "—"}
            </p>
          </Card>
          <Card className="!p-3 border-harley-gray/50">
            <p className="text-[10px] uppercase tracking-wide text-harley-text-muted mb-0.5">
              ROI on cost
            </p>
            <p className="text-lg font-bold text-harley-orange tabular-nums">
              {roiPct != null ? `${roiPct >= 0 ? "+" : ""}${roiPct.toFixed(0)}%` : "—"}
            </p>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Leads generated"
          type="number"
          min={0}
          value={leads}
          onChange={(e) => setLeads(e.target.value)}
          placeholder="0"
          disabled={!canEdit}
        />
        <Input
          label="Bikes sold (estimate)"
          type="number"
          min={0}
          value={bikesSold}
          onChange={(e) => setBikesSold(e.target.value)}
          placeholder="0"
          disabled={!canEdit}
        />
        <Input
          label="Service revenue ($)"
          type="number"
          step="0.01"
          min={0}
          value={serviceRev}
          onChange={(e) => setServiceRev(e.target.value)}
          placeholder="0.00"
          disabled={!canEdit}
        />
        <Input
          label="Motorclothes revenue ($)"
          type="number"
          step="0.01"
          min={0}
          value={motorRev}
          onChange={(e) => setMotorRev(e.target.value)}
          placeholder="0.00"
          disabled={!canEdit}
        />
        <Input
          label="Bike sales revenue ($ est.)"
          type="number"
          step="0.01"
          min={0}
          value={bikeSalesRev}
          onChange={(e) => setBikeSalesRev(e.target.value)}
          placeholder="0.00"
          disabled={!canEdit}
        />
        <Input
          label="Event cost ($ est.)"
          type="number"
          step="0.01"
          min={0}
          value={eventCost}
          onChange={(e) => setEventCost(e.target.value)}
          placeholder="Optional — for net & ROI"
          disabled={!canEdit}
        />
      </div>

      <p className="text-xs text-harley-text-muted">
        Total revenue sums service, motorclothes, and bike sales dollars. Net =
        revenue minus event cost. ROI % is net ÷ cost when cost is entered.
      </p>

      {canEdit ? (
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save ROI
        </Button>
      ) : (
        <p className="text-xs text-harley-text-muted">
          ROI fields can be updated by managers and admins.
        </p>
      )}

      {(event.roi_leads_generated != null && event.roi_leads_generated > 0) ||
      (event.roi_bikes_sold != null && event.roi_bikes_sold > 0) ? (
        <div className="flex flex-wrap gap-4 pt-1 text-sm text-harley-text-muted">
          {event.roi_leads_generated != null && event.roi_leads_generated > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4 text-harley-orange" />
              {event.roi_leads_generated} leads
            </span>
          )}
          {event.roi_bikes_sold != null && event.roi_bikes_sold > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-harley-orange" />
              {event.roi_bikes_sold} bikes sold
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
