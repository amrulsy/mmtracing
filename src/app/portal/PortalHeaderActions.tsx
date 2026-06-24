"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell } from "lucide-react";
import { useUnreadCount } from "@/hooks/usePortalApi";

export function PortalHeaderActions() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { unreadCount } = useUnreadCount();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Link href="/portal/notifikasi" className="relative p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </Link>
      
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground"
        suppressHydrationWarning
      >
        {mounted ? (theme === "dark" ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
      </button>

      <Link href="/" className="hidden sm:flex text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-hover">
        Beranda
      </Link>
    </div>
  );
}
