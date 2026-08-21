"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface ColdStartBannerProps {
  backendUrl: string;
  onStatusChange?: (isHealthy: boolean) => void;
}

export const ColdStartBanner = ({ backendUrl, onStatusChange }: ColdStartBannerProps) => {
  const [status, setStatus] = useState<"checking" | "healthy" | "warming">("checking");

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/healthz`, { cache: "no-store" });
      const isHealthy = response.ok;
      setStatus(isHealthy ? "healthy" : "warming");
      onStatusChange?.(isHealthy);
    } catch {
      setStatus("warming");
      onStatusChange?.(false);
    }
  }, [backendUrl, onStatusChange]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void checkHealth(), 0);
    const interval = window.setInterval(() => void checkHealth(), 8000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
    };
  }, [checkHealth]);

  if (status === "healthy" || status === "checking") return null;

  return (
    <div className="system-notice" role="status">
      <div className="system-notice-inner">
        <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-[#b26635]" />
        <p><strong>Search is warming up.</strong> Your resume index is starting; this usually takes less than a minute.</p>
        <button onClick={() => void checkHealth()} type="button">Check again</button>
      </div>
    </div>
  );
};
