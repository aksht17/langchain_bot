"use client";

import React, { useState } from "react";
import { ColdStartBanner } from "@/components/ColdStartBanner";
import { ChatInterface } from "@/components/ChatInterface";
import { Bot, Sparkles, Activity, Layers, Database, ShieldCheck, ExternalLink } from "lucide-react";

export default function Home() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  return (
    <main className="flex flex-col h-screen w-full bg-[#090d16] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]">
      {/* Top Cold-Start / Health Monitoring Banner */}
      <ColdStartBanner
        backendUrl={backendUrl}
        onStatusChange={(healthy) => setIsBackendHealthy(healthy)}
      />

      {/* Navigation Header */}
      <header className="px-6 py-3 border-b border-white/10 glass-panel flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-gray-200 to-indigo-300 bg-clip-text text-transparent">
                Antigravity Agentic Resume RAG
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                v1.0 Copilot
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Autonomous Multi-Agent Recruitment & Evaluation Engine (2,000+ Profiles)
            </p>
          </div>
        </div>

        {/* Stack Status Badges & LangSmith Link */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-white/10 text-gray-300">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>LangGraph 5-Node</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-white/10 text-gray-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pinecone Serverless</span>
          </div>

          <a
            href="https://smith.langchain.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 transition"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>LangSmith Traces</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </header>

      {/* Main Chat Interface */}
      <div className="flex-1 flex overflow-hidden">
        <ChatInterface backendUrl={backendUrl} />
      </div>
    </main>
  );
}
