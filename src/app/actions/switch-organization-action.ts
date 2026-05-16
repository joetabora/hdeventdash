"use server";

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
  if (error) redirect("/dashboard");

  await setOrganizationSelectionCookie(organizationId);
  redirect("/dashboard");
}
