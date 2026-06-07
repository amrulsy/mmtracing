"use client";

import { AlertCircle } from "lucide-react";

interface SpkIssueBannerProps {
  status: string;
  catatan?: string | null;
}

export function SpkIssueBanner({ status, catatan }: SpkIssueBannerProps) {
  if (!(status === "kendala" && catatan)) return null;

  return (
    <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm animate-in fade-in">
      <AlertCircle size={18} className="shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">Laporan Kendala</p>
        <p className="text-xs mt-0.5">{catatan}</p>
      </div>
    </div>
  );
}
