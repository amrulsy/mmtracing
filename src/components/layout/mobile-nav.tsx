"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, CarFront, FileText, Wrench, Wallet, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/app", icon: LayoutDashboard },
  { name: "Kendaraan", href: "/app/kendaraan", icon: CarFront },
  { name: "SPK", href: "/app/spk", icon: FileText },
  { name: "Monitoring", href: "/app/monitoring", icon: Wrench },
  { name: "Pembayaran", href: "/app/pembayaran", icon: Wallet },
  { name: "Laporan", href: "/app/laporan", icon: BarChart3 },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-200" onClick={onClose} />
      <aside className="fixed left-0 top-0 z-50 h-screen w-72 bg-background border-r border-surface-border shadow-2xl lg:hidden animate-in slide-in-from-left duration-300 flex flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-surface-border">
          <Link href="/app" className="flex items-center gap-2" onClick={onClose}>
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold shadow-glossy-primary">M</div>
            <span className="font-bold text-xl tracking-tight">MM Tracing</span>
          </Link>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-base",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-glossy-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                )}
              >
                <item.icon size={22} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-surface-border">
          <Link
            href="/app/settings"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <Settings size={22} />
            <span>Pengaturan</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
