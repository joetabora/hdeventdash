import { AppProviders } from "@/components/layout/app-providers";
import { AppChrome } from "@/components/layout/app-chrome";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-harley-black">
      <AppProviders>
        <AppChrome>{children}</AppChrome>
      </AppProviders>
    </div>
  );
}
