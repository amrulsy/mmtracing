"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Shield, Key, Bell, Palette, MessageSquare, Database, Globe } from "lucide-react";

const settingsTabs = [
  { icon: Users, label: "User", href: "/app/settings" },
  { icon: Shield, label: "Role Akses", href: "/app/settings/roles" },
  { icon: Key, label: "Keamanan", href: "/app/settings/keamanan" },
  { icon: Bell, label: "Notifikasi", href: "/app/settings/notifikasi" },
  { icon: Palette, label: "Tampilan", href: "/app/settings/tampilan" },
  { icon: MessageSquare, label: "WhatsApp", href: "/app/settings/whatsapp" },
  { icon: Database, label: "Backup", href: "/app/settings/backup" },
  { icon: Globe, label: "Landing Page", href: "/app/settings/landing" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">Konfigurasi sistem, pengguna, dan profil bengkel.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Tabs */}
        <div className="glass-panel p-1.5 lg:p-2 lg:col-span-1 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible h-fit">
          {settingsTabs.map((tab, i) => {
            const isActive = pathname === tab.href;
            return (
              <Link key={i} href={tab.href} className={`flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-xl text-xs lg:text-sm font-medium whitespace-nowrap transition-colors ${isActive ? "bg-primary text-primary-foreground shadow-glossy-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}>
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-4 lg:space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
