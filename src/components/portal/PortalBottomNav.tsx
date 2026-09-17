"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, CalendarPlus, Trophy, UserCircle } from "lucide-react";

const NAV_ITEMS = [
  { href: "/portal/dashboard", icon: LayoutDashboard, label: "Beranda" },
  { href: "/portal/pembayaran", icon: Wallet, label: "Transaksi" },
  { href: "/portal/booking", icon: CalendarPlus, label: "Booking", primary: true },
  { href: "/portal/loyalty", icon: Trophy, label: "Loyalty" },
  { href: "/portal/profile", icon: UserCircle, label: "Profil" },
];

export function PortalBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi pelanggan" className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-2 safe-bottom md:hidden">
      <div className="relative grid grid-cols-5 h-[4.5rem] max-w-lg mx-auto rounded-[1.75rem] border border-surface-border bg-background/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/portal/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.primary) return (
            <div key={item.href} className="col-start-3">
              <Link
                href={item.href}
                aria-label="Buat booking"
                className="absolute left-1/2 -top-6 -translate-x-1/2 flex flex-col items-center gap-1"
              >
                <span className="w-[3.75rem] h-[3.75rem] rounded-full bg-primary text-primary-foreground border-4 border-background shadow-lg shadow-primary/30 flex items-center justify-center transition-transform active:scale-95">
                  <CalendarPlus size={25} strokeWidth={2.4} />
                </span>
                <span className="text-[10px] font-black text-primary leading-none">Booking</span>
              </Link>
            </div>
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors rounded-2xl my-2 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {/* Active indicator line */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}

              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>

              <span className={`text-xs font-semibold leading-none ${isActive ? "font-bold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
