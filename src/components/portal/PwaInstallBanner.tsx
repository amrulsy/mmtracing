"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA Install Prompt Banner.
 * Shows a banner suggesting the user install the app to their home screen.
 * Only appears on mobile, when the app is not already installed, 
 * and the user hasn't dismissed it recently.
 */
export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");

  useEffect(() => {
    // Check if already dismissed recently (24h cooldown)
    let dismissed: string | null = null;
    try { dismissed = localStorage.getItem("mmt_pwa_dismissed"); } catch { /* Storage may be unavailable. */ }
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return;
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    setInstallError("");
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setShowBanner(false);
      setDeferredPrompt(null);
    } catch {
      setInstallError("Pemasangan belum berhasil. Silakan coba lagi.");
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try { localStorage.setItem("mmt_pwa_dismissed", String(Date.now())); } catch { /* Dismiss for this visit. */ }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-background border border-surface-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
          <Download size={20} />
        </div>
        <div className="flex-1 min-w-[120px]">
          <p className="text-sm font-bold">Pasang MMT Portal</p>
          <p className="text-xs text-muted-foreground">Akses lebih cepat dari Home Screen</p>
        </div>
        <button
          onClick={handleInstall}
          disabled={installing}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shrink-0 active:scale-95"
        >
          {installing ? "Memasang..." : "Pasang"}
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Tutup ajakan pemasangan"
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X size={16} />
        </button>
        {installError && <p role="status" className="w-full text-sm text-primary">{installError}</p>}
      </div>
    </div>
  );
}
