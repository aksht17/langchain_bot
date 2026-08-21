"use client";

import React, { useState } from "react";
import { ColdStartBanner } from "@/components/ColdStartBanner";
import { ChatInterface } from "@/components/ChatInterface";
import { Sparkles, Wifi } from "lucide-react";

export default function Home() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  return (
    <main className="app-shell flex flex-col h-screen w-full text-slate-900">
      <ColdStartBanner
        backendUrl={backendUrl}
        onStatusChange={(healthy) => setIsBackendHealthy(healthy)}
      />

      <header className="px-5 py-4 border-b border-white/70 bg-white/35 backdrop-blur-2xl z-10 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand-mark w-10 h-10 rounded-2xl bg-slate-900/90 text-white flex items-center justify-center shadow-[0_8px_18px_rgba(15,23,42,0.16)]">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <h1 className="font-semibold text-lg tracking-tight text-slate-900">TalentLens</h1>
              <p className="text-[11px] text-slate-500">Find the right people, faster</p>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/45 border border-white/80 text-xs shadow-sm ${isBackendHealthy ? "text-emerald-700" : "text-amber-700"}`}>
            <Wifi className="w-3.5 h-3.5" />
            <span>{isBackendHealthy ? "Ready to search" : "Waking up"}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ChatInterface backendUrl={backendUrl} />
      </div>
    </main>
  );
}
