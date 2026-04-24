"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/layout/global-search";

export function Topbar() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 h-14 lg:h-16 border-b border-surface-border glass px-4 lg:px-8 flex items-center justify-between lg:sticky lg:left-auto lg:right-auto select-none">
        <div className="flex items-center gap-3">
          {/* Mobile branding */}
          <Link href="/app" className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-white text-sm font-bold shadow-glossy-primary">
              M
            </div>
            <span className="font-bold text-lg tracking-tight">MM Tracing</span>
          </Link>

          {/* Desktop search */}
          <GlobalSearch className="hidden lg:block" />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/app/notifikasi" className="relative p-2 rounded-full hover:bg-surface-hover transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background animate-pulse" />
          </Link>
          <div className="h-8 w-8 rounded-full bg-surface-border border border-surface flex flex-col items-center justify-center overflow-hidden cursor-pointer">
            <img src="https://i.pravatar.cc/150?img=11" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Mobile search bar */}
      <div className="fixed top-14 left-0 right-0 z-20 lg:hidden px-4 py-2 bg-background/80 backdrop-blur-lg border-b border-surface-border select-none">
        <GlobalSearch isMobile />
      </div>
    </>
  );
}
