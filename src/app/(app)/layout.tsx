import { AppProviders } from "@/components/layout/app-providers";
import { AppChrome } from "@/components/layout/app-chrome";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? await getUserRole(supabase, user.id) : null;
  const userEmail = user?.email ?? null;

  return (
    <div className="min-h-screen bg-harley-black">
      <AppProviders role={role}>
        <AppChrome userEmail={userEmail}>{children}</AppChrome>
      </AppProviders>
    </div>
  );
}
