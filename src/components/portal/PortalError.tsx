"use client";

import { WifiOff, ServerCrash, RefreshCw } from "lucide-react";

interface PortalErrorProps {
  error: { type: "auth" | "network" | "server"; message: string };
  onRetry?: () => void;
}

/**
 * Network-aware error display for portal pages.
 * Shows a retry button for network/server errors instead of forcing logout.
 */
export function PortalError({ error, onRetry }: PortalErrorProps) {
  const isNetwork = error.type === "network";

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
          isNetwork
            ? "bg-amber-500/10 text-amber-500"
            : "bg-red-500/10 text-red-500"
        }`}
      >
        {isNetwork ? <WifiOff size={40} /> : <ServerCrash size={40} />}
      </div>

      <h2 className="text-lg font-black mb-1">
        {isNetwork ? "Tidak Ada Koneksi" : "Terjadi Kesalahan"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {error.message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2 active:scale-95"
        >
          <RefreshCw size={16} /> Coba Lagi
        </button>
      )}
    </div>
  );
}
