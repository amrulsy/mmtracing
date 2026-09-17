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
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const primaryTabs = [
  { name: "Beranda", href: "/app", icon: LayoutDashboard },
  { name: "Pekerjaan", href: "/app/work-order", icon: FileText },
  { name: "Progres", href: "/app/monitoring", icon: Wrench },
  { name: "Tagihan", href: "/app/pembayaran", icon: Wallet },
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
      <Modal open={showMore} onClose={() => setShowMore(false)} title="Menu lainnya" placement="bottom">
          {/* Menu Grid */}
          <div className="overflow-y-auto flex-1 pb-8 px-4">
            {moreMenuGroups.map((group, gi) => (
              <div key={gi} className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                  {group.label}
                </p>
                <div className="grid grid-cols-3 min-[400px]:grid-cols-4 gap-1">
                  {group.items.map((item) => {
                    const isActive = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
                    const badge = "badgeKey" in item && item.badgeKey === "booking" ? newBookingCount : 0;
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
                            isActive ? "bg-primary text-white" : "bg-surface-hover"
                          )}
                        >
                          <item.icon size={20} />
                          {badge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-sm border-2 border-background animate-pulse">
                              {badge > 9 ? "9+" : badge}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium leading-tight text-center">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
      </Modal>

      {/* Bottom Tab Bar */}
      <nav aria-label="Navigasi utama" className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden select-none">
        <div className="bg-background border-t border-surface-border safe-bottom">
          <div className="grid grid-cols-5 h-16 px-1">
            {primaryTabs.map((tab) => {
              const isMore = tab.href === "#more";
              const isActive = isMore
                ? (showMore || isMoreActive)
                : tab.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(tab.href);

              const content = (<>
                  <tab.icon size={22} aria-hidden="true" />
                  <span className="text-xs leading-tight">{tab.name}</span>
                  {isMore && newBookingCount > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-primary rounded-full" />}
                </>);
              const className = cn(
                    "flex min-w-0 flex-col items-center justify-center gap-1 min-h-12 rounded-xl relative",
                isActive ? "text-primary font-bold" : "text-muted-foreground"
              );
              return isMore ? (
                <button key={tab.href} type="button" aria-haspopup="dialog" aria-label={newBookingCount > 0 ? `Menu lainnya, ${newBookingCount} booking baru` : "Menu lainnya"} aria-expanded={showMore} onClick={() => setShowMore(true)} className={className}>{content}</button>
              ) : (
                <Link key={tab.href} href={tab.href} aria-current={isActive ? "page" : undefined} className={className}>{content}</Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
