"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-harley-black">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main area offset by sidebar width on desktop */}
      <div id="app-shell-main" className="lg:pl-64 flex flex-col min-h-screen">
        <TopHeader onMenuToggle={() => setMobileOpen((v) => !v)} />

        <main className="flex-1 overflow-y-auto">
          <div
            id="app-shell-scroll-inner"
            className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
