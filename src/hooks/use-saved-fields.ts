"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Tracks which fields recently saved successfully.
 * Call `flash(key)` after a save succeeds — the key stays
 * in the set for `duration` ms, then disappears.
 */
export function useSavedFields(duration = 1500) {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const flash = useCallback(
    (key: string) => {
      const prev = timers.current.get(key);
      if (prev) clearTimeout(prev);
      setSaved((s) => {
        const next = new Set(s);
        next.add(key);
        return next;
      });
      const t = setTimeout(() => {
        setSaved((s) => {
          const next = new Set(s);
          next.delete(key);
          return next;
        });
        timers.current.delete(key);
      }, duration);
      timers.current.set(key, t);
    },
    [duration]
  );

  return { saved, flash } as const;
}
