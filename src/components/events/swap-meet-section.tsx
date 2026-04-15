"use client";

import { useState, useRef } from "react";
import {
  SwapMeetSpot,
  SwapMeetSpotSize,
  SWAP_MEET_SPOT_SIZES,
} from "@/types/database";
import {
  apiAddSwapMeetSpot,
  apiPatchSwapMeetSpot,
  apiDeleteSwapMeetSpot,
  apiUploadSwapMeetWaiver,
} from "@/lib/events-api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Upload,
  FileCheck,
  Loader2,
} from "lucide-react";

interface SwapMeetSectionProps {
  eventId: string;
  spots: SwapMeetSpot[];
  canMutate: boolean;
  onUpdate: () => void;
  onOptimisticPatch?: (spotId: string, updates: Partial<SwapMeetSpot>) => void;
  onOptimisticAdd?: (spot: SwapMeetSpot) => void;
  onOptimisticRemove?: (spotId: string) => void;
}

export function SwapMeetSection({
  eventId,
  spots,
  canMutate,
  onUpdate,
  onOptimisticPatch,
  onOptimisticAdd,
  onOptimisticRemove,
}: SwapMeetSectionProps) {
  const [adding, setAdding] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSize, setNewSize] = useState<SwapMeetSpotSize>("10x10");

  const waiverRef = useRef<HTMLInputElement>(null);
  const [uploadingSpotId, setUploadingSpotId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const created = await apiAddSwapMeetSpot(eventId, {
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        spot_size: newSize,
      });
      onOptimisticAdd?.(created);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewSize("10x10");
    } catch (err) {
      console.error(err);
      onUpdate();
    } finally {
      setAdding(false);
    }
  }

  function handlePatch(
    spotId: string,
    field: string,
    value: string
  ) {
    const prev = spots.find((s) => s.id === spotId);
    onOptimisticPatch?.(spotId, { [field]: value });
    apiPatchSwapMeetSpot(eventId, spotId, { [field]: value }).catch((err) => {
      console.error(err);
      if (prev) {
        onOptimisticPatch?.(spotId, { [field]: (prev as unknown as Record<string, unknown>)[field] as string });
      }
      onUpdate();
    });
  }

  function handleDelete(spotId: string) {
    if (!confirm("Remove this swap meet spot?")) return;
    onOptimisticRemove?.(spotId);
    apiDeleteSwapMeetSpot(eventId, spotId).catch((err) => {
      console.error(err);
      onUpdate();
    });
  }

  async function handleWaiverUpload(spotId: string, file: File) {
    setUploadingSpotId(spotId);
    try {
      await apiUploadSwapMeetWaiver(eventId, spotId, file);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingSpotId(null);
    }
  }

  return (
    <div className="space-y-4">
      {canMutate && (
        <Card className="!p-4">
          <form onSubmit={handleAdd} className="space-y-3">
            <p className="text-xs text-harley-text-muted font-medium">
              Add a swap meet spot
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
                  Name *
                </label>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-sm text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Person's name"
                  required
                />
              </div>
              <Select
                label="Spot Size"
                options={SWAP_MEET_SPOT_SIZES}
                value={newSize}
                onChange={(e) => setNewSize(e.target.value as SwapMeetSpotSize)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-sm text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-sm text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={adding || !newName.trim()} className="w-full sm:w-auto">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Spot
            </Button>
          </form>
        </Card>
      )}

      {spots.length === 0 ? (
        <p className="text-sm text-harley-text-muted py-2">
          No swap meet spots reserved yet.
        </p>
      ) : (
        <div className="space-y-2">
          {spots.map((spot) => {
            const uploading = uploadingSpotId === spot.id;
            return (
              <Card key={spot.id} className="!p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {canMutate ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-0.5">Name</label>
                            <input
                              className="w-full px-2.5 py-1.5 rounded-lg bg-harley-black/30 border border-harley-gray-lighter/40 text-sm text-harley-text focus:outline-none focus:border-harley-orange/60"
                              defaultValue={spot.name}
                              key={`${spot.id}-name`}
                              onBlur={(e) => {
                                if (e.target.value !== spot.name) handlePatch(spot.id, "name", e.target.value);
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-0.5">Phone</label>
                            <input
                              className="w-full px-2.5 py-1.5 rounded-lg bg-harley-black/30 border border-harley-gray-lighter/40 text-sm text-harley-text focus:outline-none focus:border-harley-orange/60"
                              defaultValue={spot.phone}
                              key={`${spot.id}-phone`}
                              onBlur={(e) => {
                                if (e.target.value !== spot.phone) handlePatch(spot.id, "phone", e.target.value);
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-harley-text-muted mb-0.5">Email</label>
                            <input
                              className="w-full px-2.5 py-1.5 rounded-lg bg-harley-black/30 border border-harley-gray-lighter/40 text-sm text-harley-text focus:outline-none focus:border-harley-orange/60"
                              defaultValue={spot.email}
                              key={`${spot.id}-email`}
                              onBlur={(e) => {
                                if (e.target.value !== spot.email) handlePatch(spot.id, "email", e.target.value);
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Select
                            label=""
                            options={SWAP_MEET_SPOT_SIZES}
                            value={spot.spot_size}
                            onChange={(e) => handlePatch(spot.id, "spot_size", e.target.value)}
                          />
                          {spot.waiver_file_name ? (
                            <span className="inline-flex items-center gap-1 text-xs text-harley-success">
                              <FileCheck className="w-3.5 h-3.5" />
                              {spot.waiver_file_name}
                            </span>
                          ) : (
                            <>
                              <input
                                ref={uploadingSpotId === null ? waiverRef : undefined}
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleWaiverUpload(spot.id, f);
                                  e.target.value = "";
                                }}
                                id={`waiver-${spot.id}`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={uploading}
                                onClick={() =>
                                  (document.getElementById(`waiver-${spot.id}`) as HTMLInputElement)?.click()
                                }
                              >
                                {uploading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5" />
                                )}
                                Upload Waiver
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-harley-text">{spot.name}</p>
                        <p className="text-xs text-harley-text-muted">
                          {[spot.spot_size, spot.phone, spot.email].filter(Boolean).join(" · ")}
                        </p>
                        {spot.waiver_file_name && (
                          <span className="inline-flex items-center gap-1 text-xs text-harley-success">
                            <FileCheck className="w-3.5 h-3.5" />
                            Waiver: {spot.waiver_file_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {canMutate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-harley-text-muted hover:text-harley-danger"
                      onClick={() => handleDelete(spot.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
