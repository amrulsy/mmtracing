"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  { name: "Home", href: "/app", icon: LayoutDashboard },
  { name: "SPK", href: "/app/spk", icon: FileText },
  { name: "Monitor", href: "/app/monitoring", icon: Wrench },
  { name: "Bayar", href: "/app/pembayaran", icon: Wallet },
  { name: "Lainnya", href: "#more", icon: MoreHorizontal },
];

const moreMenuGroups = [
  {
    label: "Utama",
    items: [
      { name: "Pelanggan", href: "/app/kendaraan", icon: CarFront },
      { name: "Booking", href: "/app/booking", icon: Calendar, badgeKey: "booking" },
      { name: "Notifikasi", href: "/app/notifikasi", icon: Bell },
      { name: "Laporan", href: "/app/laporan", icon: BarChart3 },
    ],
  },
  {
    label: "Master Data",
    items: [
      { name: "Sparepart", href: "/app/master/sparepart", icon: Package },
      { name: "Jasa & Layanan", href: "/app/master/jasa", icon: Hammer },
      { name: "Supplier", href: "/app/master/supplier", icon: Truck },
      { name: "Inventaris", href: "/app/inventaris", icon: Boxes },
    ],
  },
  {
    label: "Tim & Jadwal",
    items: [
      { name: "Mekanik", href: "/app/mekanik", icon: Users },
      { name: "Jadwal", href: "/app/jadwal", icon: Calendar },
    ],
  },
  {
    label: "Operasional",
    items: [
      { name: "Inspeksi", href: "/app/inspeksi", icon: ClipboardCheck },
      { name: "Garansi", href: "/app/garansi", icon: Shield },
      { name: "Pengeluaran", href: "/app/pengeluaran", icon: Receipt },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { name: "Loyalty", href: "/app/loyalty", icon: Star },
      { name: "Log Aktivitas", href: "/app/log-aktivitas", icon: ScrollText },
      { name: "Bantuan", href: "/app/bantuan", icon: HelpCircle },
      { name: "Pengaturan", href: "/app/settings", icon: Settings },
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const [newBookingCount, setNewBookingCount] = useState(0);

  // Poll for new booking count
  useEffect(() => {
    const fetchCount = () => {
      fetch("/api/v1/booking/stats", {
        headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mm_token") || "" : ""}` },
      })
        .then(r => r.json())
        .then(res => { if (res.success && res.data) setNewBookingCount(res.data.baru || 0); })
        .catch(() => {});
    };
    fetchCount();
    const iv = setInterval(fetchCount, 30000);
    return () => clearInterval(iv);
  }, []);

  // Check if current path matches any "more" menu item
  const isMoreActive = moreMenuGroups
    .flatMap((g) => g.items)
    .some((item) => item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href));

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
                    const isActive = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
                    const badge = (item as any).badgeKey === "booking" ? newBookingCount : 0;
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
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative",
                            isActive ? "bg-primary text-white shadow-glossy-primary" : "bg-surface-hover"
                          )}
                        >
                          <item.icon size={20} />
                          {badge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm border-2 border-background animate-pulse">
                              {badge > 9 ? "9+" : badge}
                            </span>
                          )}
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
      <nav className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden select-none">
        {/* Frosted glass background */}
        <div className="bg-background/80 backdrop-blur-xl border-t border-surface-border safe-bottom">
          <div className="flex items-start justify-around px-2 pt-1.5 pb-2">
            {primaryTabs.map((tab) => {
              const isMore = tab.href === "#more";
              const isActive = isMore
                ? (showMore || isMoreActive)
                : tab.href === "/app"
                  ? pathname === "/app"
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
                    "flex flex-col items-center gap-0.5 min-w-[56px] py-1 rounded-xl transition-all duration-200 active:scale-90 relative",
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
                    {/* Badge for 'Lainnya' tab if there's a notification inside */}
                    {isMore && newBookingCount > 0 && (
                      <span className="absolute -top-1 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
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
