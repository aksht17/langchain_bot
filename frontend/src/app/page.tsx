"use client";

import { useState } from "react";
import { Activity, Compass, Sparkles } from "lucide-react";
import { ChatInterface } from "@/components/ChatInterface";
import { ColdStartBanner } from "@/components/ColdStartBanner";

export default function Home() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  const statusLabel = isBackendHealthy === null ? "Checking search index" : isBackendHealthy ? "Search index ready" : "Warming up search index";

  return (
    <main className="app-shell min-h-screen w-full text-[#28241f]">
      <header className="atlas-header">
        <div className="atlas-header-inner">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="brand-emblem" aria-hidden="true">
              <Compass className="h-[18px] w-[18px]" />
              <span className="brand-emblem-spark"><Sparkles className="h-2.5 w-2.5" /></span>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="brand-wordmark">TalentLens</p>
                <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a9187] sm:inline">Talent atlas</span>
              </div>
              <p className="mt-0.5 hidden text-[11px] text-[#746c62] sm:block">Evidence-led candidate discovery</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full border border-[#e6e0d7] bg-[#fffdfa]/75 px-3 py-1.5 text-[11px] font-medium text-[#71695f] md:inline-flex">
              Resume intelligence, distilled
            </span>
            <span className={`connection-pill ${isBackendHealthy === false ? "connection-pill-warming" : ""}`} aria-live="polite">
              <span className="connection-dot" />
              <Activity className="h-3 w-3" />
              <span className="hidden sm:inline">{statusLabel}</span>
              <span className="sm:hidden">{isBackendHealthy === false ? "Warming" : "Ready"}</span>
            </span>
          </div>
        </div>
      </header>

      <ColdStartBanner backendUrl={backendUrl} onStatusChange={setIsBackendHealthy} />
      <ChatInterface backendUrl={backendUrl} />
    </main>
  );
}
