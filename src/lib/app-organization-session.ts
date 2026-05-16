import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { loadAppOrganizationBootstrap } from "@/lib/organization-server";
import type { Organization } from "@/types/database";

/**
 * Dedupes auth + org resolution within a single RSC request (layout + page both call this).
 */
export const getCachedOrganizationSession = cache(
  async (): Promise<{
    supabase: Awaited<ReturnType<typeof createClient>>;
    user: User | null;
    sessionOrgId: string | null;
    memberships: Organization[];
  }> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        supabase,
        user: null,
        sessionOrgId: null,
        memberships: [],
      };
    }

    const { sessionOrgId, memberships } = await loadAppOrganizationBootstrap(
      supabase,
      user
    );

    return { supabase, user, sessionOrgId, memberships };
  }
);
