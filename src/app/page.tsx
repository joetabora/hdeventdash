import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { Calendar, LayoutGrid, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-harley-black px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Zap className="w-10 h-10 text-harley-orange" />
            <h1 className="text-4xl md:text-5xl font-bold text-harley-text">
              Harley Event Dashboard
            </h1>
          </div>
          <p className="text-harley-text-muted text-lg">
            Plan, execute, and track events from start to finish.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <Card hover>
            <LayoutGrid className="w-6 h-6 text-harley-orange mb-3" />
            <h3 className="font-semibold text-harley-text mb-1">Kanban Board</h3>
            <p className="text-sm text-harley-text-muted">
              Drag and drop events through every stage
            </p>
          </Card>
          <Card hover>
            <Calendar className="w-6 h-6 text-harley-orange mb-3" />
            <h3 className="font-semibold text-harley-text mb-1">Calendar View</h3>
            <p className="text-sm text-harley-text-muted">
              Visualize your event timeline at a glance
            </p>
          </Card>
          <Card hover>
            <Zap className="w-6 h-6 text-harley-orange mb-3" />
            <h3 className="font-semibold text-harley-text mb-1">Live Mode</h3>
            <p className="text-sm text-harley-text-muted">
              Simplified view for day-of execution
            </p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/login" className={buttonStyles.primary("lg")}>
            Sign In
          </Link>
          <Link href="/auth/signup" className={buttonStyles.secondary("lg")}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
