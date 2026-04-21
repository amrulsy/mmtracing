"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Wallet,
  MoreHorizontal,
  X,
  CarFront,
  BarChart3,
  Package,
  Hammer,
  Users,
  Calendar,
  Shield,
  Receipt,
  Star,
  Settings,
  HelpCircle,
  Bell,
  Boxes,
  Truck,
  ScrollText,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryTabs = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "SPK", href: "/spk", icon: FileText },
  { name: "Monitor", href: "/monitoring", icon: Wrench },
  { name: "Bayar", href: "/pembayaran", icon: Wallet },
  { name: "Lainnya", href: "#more", icon: MoreHorizontal },
];

const moreMenuGroups = [
  {
    label: "Utama",
    items: [
      { name: "Pelanggan", href: "/kendaraan", icon: CarFront },
      { name: "Notifikasi", href: "/notifikasi", icon: Bell },
      { name: "Laporan", href: "/laporan", icon: BarChart3 },
    ],
  },
  {
    label: "Master Data",
    items: [
      { name: "Sparepart", href: "/master/sparepart", icon: Package },
      { name: "Jasa & Layanan", href: "/master/jasa", icon: Hammer },
      { name: "Supplier", href: "/master/supplier", icon: Truck },
      { name: "Inventaris", href: "/inventaris", icon: Boxes },
    ],
  },
  {
    label: "Tim & Jadwal",
    items: [
      { name: "Mekanik", href: "/mekanik", icon: Users },
      { name: "Jadwal", href: "/jadwal", icon: Calendar },
    ],
  },
  {
    label: "Operasional",
    items: [
      { name: "Inspeksi", href: "/inspeksi", icon: ClipboardCheck },
      { name: "Garansi", href: "/garansi", icon: Shield },
      { name: "Pengeluaran", href: "/pengeluaran", icon: Receipt },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { name: "Loyalty", href: "/loyalty", icon: Star },
      { name: "Log Aktivitas", href: "/log-aktivitas", icon: ScrollText },
      { name: "Bantuan", href: "/bantuan", icon: HelpCircle },
      { name: "Pengaturan", href: "/settings", icon: Settings },
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  // Check if current path matches any "more" menu item
  const isMoreActive = moreMenuGroups
    .flatMap((g) => g.items)
    .some((item) => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));

  return (
    <>
      {/* More Sheet Overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[95] lg:hidden transition-transform duration-300 ease-out",
          showMore ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="bg-background border-t border-surface-border rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col">
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-surface-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-surface-border">
            <h3 className="font-bold text-lg">Menu</h3>
            <button
              onClick={() => setShowMore(false)}
              className="p-1.5 rounded-full bg-surface-hover text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Menu Grid */}
          <div className="overflow-y-auto flex-1 pb-8 px-4">
            {moreMenuGroups.map((group, gi) => (
              <div key={gi} className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                  {group.label}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {group.items.map((item) => {
                    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setShowMore(false)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all active:scale-95",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-surface-hover active:bg-surface-hover"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            isActive ? "bg-primary text-white shadow-glossy-primary" : "bg-surface-hover"
                          )}
                        >
                          <item.icon size={20} />
                        </div>
                        <span className="text-[10px] font-medium leading-tight text-center">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden">
        {/* Frosted glass background */}
        <div className="bg-background/80 backdrop-blur-xl border-t border-surface-border pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-start justify-around px-2 pt-1.5 pb-1.5">
            {primaryTabs.map((tab) => {
              const isMore = tab.href === "#more";
              const isActive = isMore
                ? (showMore || isMoreActive)
                : tab.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(tab.href);

              return (
                <button
                  key={tab.name}
                  onClick={() => {
                    if (isMore) {
                      setShowMore(!showMore);
                    } else {
                      setShowMore(false);
                      window.location.href = tab.href;
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-0.5 min-w-[56px] py-1 rounded-xl transition-all duration-200 active:scale-90",
                    isActive && !isMore ? "text-primary" : isMore && showMore ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "relative w-10 h-7 flex items-center justify-center rounded-full transition-all duration-300",
                      isActive && !isMore ? "bg-primary/10 scale-110" : ""
                    )}
                  >
                    <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                    {isActive && !isMore && (
                      <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] leading-none transition-all",
                      isActive ? "font-bold" : "font-medium"
                    )}
                  >
                    {tab.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
