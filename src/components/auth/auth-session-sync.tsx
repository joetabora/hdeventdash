"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * After server actions update Auth user_metadata (e.g. dealership switch),
 * the browser may still hold an old access token; refresh so Postgres RLS/JWT align.
 *
 * Also handles org switch landing on `/dashboard` with unchanged pathname: the server
 * redirects with `?org_switch=1` so we run `refreshSession` + `router.refresh()`.
 */
function AuthSessionSyncInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSwitch = searchParams.get("org_switch");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const run = async () => {
      await supabase.auth.refreshSession();
      if (orgSwitch === "1") {
        router.refresh();
        router.replace("/dashboard", { scroll: false });
      }
    };
    void run();
  }, [pathname, orgSwitch, router]);

  return null;
}

export function AuthSessionSync() {
  return (
    <Suspense fallback={null}>
      <AuthSessionSyncInner />
    </Suspense>
  );
}
