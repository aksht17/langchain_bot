"use client";

import React, { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface ColdStartBannerProps {
  backendUrl: string;
  onStatusChange?: (isHealthy: boolean) => void;
}

export const ColdStartBanner: React.FC<ColdStartBannerProps> = ({ backendUrl, onStatusChange }) => {
  const [status, setStatus] = useState<"checking" | "healthy" | "cold_start" | "error">("checking");
  const [retryCount, setRetryCount] = useState(0);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${backendUrl}/healthz`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStatus("healthy");
        if (onStatusChange) onStatusChange(true);
      } else {
        setStatus("cold_start");
        if (onStatusChange) onStatusChange(false);
      }
    } catch {
      setStatus("cold_start");
      if (onStatusChange) onStatusChange(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => {
      checkHealth();
      setRetryCount((prev) => prev + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, [backendUrl]);

  if (status === "healthy") {
    return (
      <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 border-b border-emerald-500/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>FastAPI Multi-Agent Backend Connected</span>
          <span className="text-emerald-600">|</span>
          <span className="text-emerald-400/80">Pinecone Index: <code className="bg-emerald-900/40 px-1 py-0.5 rounded text-emerald-300">resume-rag</code></span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400/70">
          <span>LangSmith Observability Active</span>
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs font-medium text-amber-300 bg-amber-950/60 border-b border-amber-500/30 backdrop-blur-md animate-pulse">
      <div className="flex items-center gap-2.5">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
        <div>
          <span className="font-semibold text-amber-200">Backend Cold-Start Notice:</span>{" "}
          <span>Render free-tier service is waking from idle (~30-45s). Re-probing endpoint (attempt {retryCount})...</span>
        </div>
      </div>
      <button
        onClick={() => checkHealth()}
        className="px-2.5 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-200 transition"
      >
        Retry Ping
      </button>
    </div>
  );
};
