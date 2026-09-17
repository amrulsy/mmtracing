"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Trophy, Bell, UserCircle } from "lucide-react";
import { useUnreadCount } from "@/hooks/usePortalApi";

const NAV_ITEMS = [
  { href: "/portal/dashboard", icon: LayoutDashboard, label: "Beranda" },
  { href: "/portal/pembayaran", icon: Wallet, label: "Transaksi" },
  { href: "/portal/loyalty", icon: Trophy, label: "Poin" },
  { href: "/portal/notifikasi", icon: Bell, label: "Notifikasi", hasBadge: true },
  { href: "/portal/profile", icon: UserCircle, label: "Profil" },
];

export function PortalBottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadCount();

  return (
    <nav aria-label="Navigasi pelanggan" className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-surface-border safe-bottom md:hidden">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/portal/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
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
                {/* Notification badge */}
                {item.hasBadge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
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
