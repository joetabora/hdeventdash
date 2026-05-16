"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ACTIVE_ORG_USER_METADATA_KEY } from "@/lib/active-organization";
import { createClient } from "@/lib/supabase/server";
import { setOrganizationSelectionCookie } from "@/lib/organization-server";
import { isValidOrganizationIdCookieValue } from "@/lib/organization-scope";

export async function switchOrganization(formData: FormData): Promise<void> {
  const raw = formData.get("organizationId");
  if (typeof raw !== "string" || !isValidOrganizationIdCookieValue(raw)) {
    redirect("/dashboard");
  }
  const organizationId = raw.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const { error } = await supabase.auth.updateUser({
    data: { [ACTIVE_ORG_USER_METADATA_KEY]: organizationId },
  });
  if (error) {
    console.error("switchOrganization updateUser failed:", error.message);
    redirect("/dashboard");
  }

  await setOrganizationSelectionCookie(organizationId);
  /** Drop stale RSC/router payload so the next paint reads the new org cookie. */
  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  /**
   * `org_switch` makes searchParams change even when already on `/dashboard`, so
   * AuthSessionSync can refresh the JWT and call `router.refresh()` (pathname alone may not change).
   */
  redirect("/dashboard?org_switch=1");
}
