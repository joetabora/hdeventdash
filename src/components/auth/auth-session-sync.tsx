"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * After dealership switch, `updateUser` metadata can lag behind the HttpOnly org cookie.
 * Only run on `?org_switch=1` (see switchOrganization action): refresh JWT, refetch RSC,
 * drop the query param.
 *
 * We intentionally do not call `refreshSession` on every pathname change — that added
 * a Supabase round trip per navigation and made the app feel slow.
 */
function AuthSessionSyncInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSwitch = searchParams.get("org_switch");

  useEffect(() => {
    if (orgSwitch !== "1") return;

    const supabase = getSupabaseBrowserClient();
    const run = async () => {
      await supabase.auth.refreshSession();
      router.refresh();
      router.replace("/dashboard", { scroll: false });
    };
    void run();
  }, [orgSwitch, router]);

  return null;
}

export function AuthSessionSync() {
  return (
    <Suspense fallback={null}>
      <AuthSessionSyncInner />
    </Suspense>
  );
}
