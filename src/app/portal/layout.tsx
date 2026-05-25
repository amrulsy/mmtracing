import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Portal | MMT Racing",
  description: "Portal pelanggan MMT Racing",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-surface-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-black text-xl tracking-tighter text-primary flex items-center gap-2">
            MMT<span className="text-foreground">PORTAL</span>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full relative">
        {/* Decorative background */}
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
        {children}
      </main>
    </div>
  );
}
