"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

/**
 * PWA Install Prompt Banner.
 * Shows a banner suggesting the user install the app to their home screen.
 * Only appears on mobile, when the app is not already installed, 
 * and the user hasn't dismissed it recently.
 */
export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already dismissed recently (24h cooldown)
    const dismissed = localStorage.getItem("mmt_pwa_dismissed");
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return;
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("mmt_pwa_dismissed", String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-[72px] md:bottom-4 left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-background border border-surface-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
          <Download size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Pasang MMT Portal</p>
          <p className="text-[11px] text-muted-foreground">Akses lebih cepat dari Home Screen</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shrink-0 active:scale-95"
        >
          Pasang
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
