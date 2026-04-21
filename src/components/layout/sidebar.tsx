"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Star,
  ScrollText,
  HelpCircle,
  ClipboardCheck,
  Shield,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Kendaraan", href: "/kendaraan", icon: CarFront },
      { name: "SPK", href: "/spk", icon: FileText },
      { name: "Monitoring", href: "/monitoring", icon: Wrench },
      { name: "Pembayaran", href: "/pembayaran", icon: Wallet },
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
    label: "Bisnis",
    items: [
      { name: "Laporan", href: "/laporan", icon: BarChart3 },
      { name: "Loyalty", href: "/loyalty", icon: Star },
      { name: "Log Aktivitas", href: "/log-aktivitas", icon: ScrollText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-surface-border glass hidden lg:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-surface-border">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform shadow-glossy-primary">
            M
          </div>
          <span className="font-bold text-xl tracking-tight">MM Tracing</span>
        </Link>
      </div>

      <div className="flex-1 py-4 px-4 space-y-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm",
                      isActive 
                        ? "bg-primary text-primary-foreground font-medium shadow-glossy-primary translate-x-1" 
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    )}
                  >
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-surface-border space-y-0.5">
        <Link
          href="/bantuan"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm",
            pathname === "/bantuan" ? "bg-primary text-primary-foreground font-medium shadow-glossy-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          )}
        >
          <HelpCircle size={18} />
          <span>Bantuan</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm",
            pathname.startsWith("/settings") ? "bg-primary text-primary-foreground font-medium shadow-glossy-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          )}
        >
          <Settings size={18} />
          <span>Pengaturan</span>
        </Link>
      </div>
    </aside>
  );
}

