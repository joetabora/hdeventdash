"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * After server actions update Auth user_metadata (e.g. dealership switch),
 * the browser may still hold an old access token; refresh so Postgres RLS/JWT align.
 */
export function AuthSessionSync() {
  const pathname = usePathname();

  useEffect(() => {
    void getSupabaseBrowserClient().auth.refreshSession();
  }, [pathname]);

  return null;
}
