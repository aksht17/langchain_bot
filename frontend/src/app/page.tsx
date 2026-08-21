"use client";

import React, { useState } from "react";
import { ColdStartBanner } from "@/components/ColdStartBanner";
import { ChatInterface } from "@/components/ChatInterface";
import { Sparkles, Activity, Layers, Database, ExternalLink } from "lucide-react";

export default function Home() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  return (
    <main className="flex flex-col h-screen w-full text-slate-900">
      <ColdStartBanner
        backendUrl={backendUrl}
        onStatusChange={(healthy) => setIsBackendHealthy(healthy)}
      />

      <header className="px-6 py-4 border-b border-white/70 bg-white/45 backdrop-blur-2xl z-10 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900/90 text-white flex items-center justify-center shadow-[0_8px_18px_rgba(15,23,42,0.16)]">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-lg tracking-tight text-slate-900">
                  Antigravity Resume Copilot
                </h1>
                <span className="text-[9px] uppercase font-semibold tracking-[0.12em] px-2 py-0.5 rounded-full bg-white/55 text-slate-600 border border-white/80 shadow-sm">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Recruiter search and candidate evaluation
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/45 border border-white/80 text-slate-700 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>LangGraph</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/45 border border-white/80 text-slate-700 shadow-sm">
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>Pinecone</span>
            </div>

            <a
              href="https://smith.langchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-700 hover:bg-blue-500/15 transition shadow-sm"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>LangSmith</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ChatInterface backendUrl={backendUrl} />
      </div>
    </main>
  );
}
