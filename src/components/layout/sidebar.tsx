"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useRole } from "@/hooks/useRole";
import { 
  LayoutDashboard, 
  CarFront, 
  FileText, 
  Wrench, 
  Wallet, 
  BarChart3,
  Settings,
  Package,
  Hammer,
  Truck,
  Boxes,
  Users,
  Calendar,
  CalendarCheck,
  Star,
  ScrollText,
  HelpCircle,
  ClipboardCheck,
  Shield,
  Receipt,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavGroup = {
  label: string;
  items: {
    name: string;
    href: string;
    icon: any;
    badgeKey?: string;
    module?: string;
  }[];
};

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      { name: "Dashboard", href: "/app", icon: LayoutDashboard, module: "dashboard" },
      { name: "Kendaraan", href: "/app/kendaraan", icon: CarFront, module: "master" },
      { name: "SPK", href: "/app/spk", icon: FileText, module: "spk" },
      { name: "Monitoring", href: "/app/monitoring", icon: Wrench, module: "monitoring" },
      { name: "Pembayaran", href: "/app/pembayaran", icon: Wallet, module: "pembayaran" },
      { name: "Booking", href: "/app/booking", icon: CalendarCheck, badgeKey: "booking", module: "booking" },
    ],
  },
  {
    label: "Master Data",
    items: [
      { name: "Sparepart", href: "/app/master/sparepart", icon: Package, module: "master" },
      { name: "Jasa & Layanan", href: "/app/master/jasa", icon: Hammer, module: "master" },
      { name: "Paket Servis", href: "/app/master/service-bundles", icon: Layers, module: "master" },
      { name: "Supplier", href: "/app/master/supplier", icon: Truck, module: "master" },
      { name: "Inventaris", href: "/app/inventaris", icon: Boxes, module: "inventaris" },
    ],
  },
  {
    label: "Tim & Jadwal",
    items: [
      { name: "Mekanik", href: "/app/mekanik", icon: Users, module: "master" },
      { name: "Jadwal", href: "/app/jadwal", icon: Calendar, module: "jadwal" },
    ],
  },
  {
    label: "Operasional",
    items: [
      { name: "Inspeksi", href: "/app/inspeksi", icon: ClipboardCheck, module: "monitoring" },
      { name: "Garansi", href: "/app/garansi", icon: Shield, module: "garansi" },
      { name: "Pengeluaran", href: "/app/pengeluaran", icon: Receipt, module: "pengeluaran" },
    ],
  },
  {
    label: "Bisnis",
    items: [
      { name: "Laporan", href: "/app/laporan", icon: BarChart3, module: "laporan" },
      { name: "Loyalty", href: "/app/loyalty", icon: Star, module: "loyalty" },
      { name: "Log Aktivitas", href: "/app/log-aktivitas", icon: ScrollText, module: "laporan" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [newBookingCount, setNewBookingCount] = useState(0);
  const { hasAccess } = useRole();

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

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-surface-border bg-background hidden lg:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-surface-border">
        <Link href="/app" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform">
            M
          </div>
          <span className="font-bold text-xl tracking-tight">MMT Racing</span>
        </Link>
      </div>

      <div className="flex-1 py-4 px-4 space-y-4 overflow-y-auto">
        {navGroups.map((group, gi) => {
          // Filter items based on access
          const filteredItems = group.items.filter(item => {
             // Allow dashboard bypass for all users for now, or use "dashboard" permission
             if (item.module === "dashboard") return true;
             return item.module ? hasAccess(item.module as any, "view") : true;
          });

          // Don't render group if empty
          if (filteredItems.length === 0) return null;

          return (
            <div key={gi}>
              {group.label && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const isActive = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
                  const badge = (item as any).badgeKey === "booking" ? newBookingCount : 0;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm",
                        isActive 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                      )}
                    >
                      <item.icon size={18} />
                      <span className="flex-1">{item.name}</span>
                      {badge > 0 && (
                        <span className={cn(
                          "min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center",
                          isActive ? "bg-white/20 text-white" : "bg-primary text-white animate-pulse"
                        )}>
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-surface-border space-y-0.5">
        <Link
          href="/app/bantuan"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm",
            pathname === "/app/bantuan" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          )}
        >
          <HelpCircle size={18} />
          <span>Bantuan</span>
        </Link>
        {hasAccess("settings", "view") && (
          <Link
            href="/app/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm",
              pathname.startsWith("/app/settings") ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            )}
          >
            <Settings size={18} />
            <span>Pengaturan</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

