import Link from "next/link";
import { Calendar, LayoutGrid, Zap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function Home() {
  return (
    <div className="relative z-[1] flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl space-y-10 py-14 text-center">
        <header className="animate-page-in space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-harley-orange">
            Milwaukee HQ · Event operations
          </p>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-5">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-harley-orange/25 bg-harley-orange/10 shadow-[var(--shadow-card)]">
              <Zap className="h-8 w-8 text-harley-orange" aria-hidden />
            </span>
            <h1 className="font-display-heading text-4xl font-bold tracking-tight text-harley-text md:text-5xl">
              Harley Event Dashboard
            </h1>
          </div>
          <p className="mx-auto max-w-xl text-lg text-harley-text-muted">
            Plan execution, synchronize teams, and close the loop with attendance and ROI in one
            command surface.
          </p>
        </header>

        <div className="grid grid-cols-1 animate-page-in animate-stagger-1 gap-4 text-left sm:grid-cols-3">
          <Card hover variant="glass" padding="lg" className="border-border-subtle">
            <LayoutGrid className="mb-3 h-7 w-7 text-harley-orange" aria-hidden />
            <h2 className="font-display-heading text-base font-semibold text-harley-text">
              Kanban board
            </h2>
            <p className="mt-1 text-sm text-harley-text-muted">
              Drag events across planning lanes with readiness signals wired in.
            </p>
          </Card>
          <Card hover variant="glass" padding="lg" className="border-border-subtle">
            <Calendar className="mb-3 h-7 w-7 text-harley-orange" aria-hidden />
            <h2 className="font-display-heading text-base font-semibold text-harley-text">
              Calendar runway
            </h2>
            <p className="mt-1 text-sm text-harley-text-muted">
              Visualize timelines to prevent conflicts across venues and teams.
            </p>
          </Card>
          <Card hover variant="glass" padding="lg" className="border-border-subtle">
            <Zap className="mb-3 h-7 w-7 text-harley-orange" aria-hidden />
            <h2 className="font-display-heading text-base font-semibold text-harley-text">
              Live mode
            </h2>
            <p className="mt-1 text-sm text-harley-text-muted">
              Distraction-free execution tooling for dealers on the showroom floor.
            </p>
          </Card>
        </div>

        <div className="flex animate-page-in animate-stagger-3 justify-center">
          <Link
            href="/auth/login"
            className={cn(buttonStyles.primary("lg"), "shadow-[var(--shadow-elevated)]")}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
