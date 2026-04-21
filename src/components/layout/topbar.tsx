"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Menu, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar() {
  return (
    <>
      <header className="sticky top-0 z-30 h-14 lg:h-16 border-b border-surface-border glass px-4 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile branding */}
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-white text-sm font-bold shadow-glossy-primary">
              M
            </div>
            <span className="font-bold text-lg tracking-tight">MM Tracing</span>
          </Link>

          {/* Desktop search */}
          <div className="hidden lg:flex items-center gap-2 bg-surface-hover px-3 py-1.5 rounded-full border border-surface-border focus-within:ring-1 focus-within:ring-primary transition-all">
            <Search size={18} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari pelanggan, no polisi, SPK..."
              className="bg-transparent border-none focus:outline-none text-sm w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/notifikasi" className="relative p-2 rounded-full hover:bg-surface-hover transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background animate-pulse" />
          </Link>
          <div className="h-8 w-8 rounded-full bg-surface-border border border-surface flex flex-col items-center justify-center overflow-hidden cursor-pointer">
            <img src="https://i.pravatar.cc/150?img=11" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Mobile search bar */}
      <div className="sticky top-14 z-20 lg:hidden px-4 py-2 bg-background/80 backdrop-blur-lg border-b border-surface-border">
        <div className="flex items-center gap-2 bg-surface-hover px-3 py-2 rounded-xl border border-surface-border focus-within:ring-1 focus-within:ring-primary transition-all">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari pelanggan, SPK, no polisi..."
            className="bg-transparent border-none focus:outline-none text-sm w-full"
          />
        </div>
      </div>
    </>
  );
}
