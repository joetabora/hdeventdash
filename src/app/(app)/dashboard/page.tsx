import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
