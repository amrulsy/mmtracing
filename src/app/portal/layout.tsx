import type { Metadata } from "next";
import Link from "next/link";
import { PortalBottomNav } from "@/components/portal/PortalBottomNav";
import { PwaInstallBanner } from "@/components/portal/PwaInstallBanner";
import { PortalHeaderActions } from "./PortalHeaderActions";

export const metadata: Metadata = {
  title: "Customer Portal | MMT Racing",
  description: "Portal pelanggan MMT Racing — Pantau riwayat servis, booking, dan tagihan Anda",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-surface-border bg-background sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-xl tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-black">M</div>
            <div>
              <span className="text-primary">MMT</span>
              <span className="text-foreground">PORTAL</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link href="/track" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors hidden sm:block">
              Lacak Work Order
            </Link>
            <PortalHeaderActions />
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full relative pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      
      <footer className="border-t border-surface-border py-6 text-center hidden md:block">
        <p className="text-[10px] text-muted-foreground">© {new Date().getFullYear()} MMT Racing — Customer Portal</p>
      </footer>

      <PortalBottomNav />
      <PwaInstallBanner />
    </div>
  );
}
