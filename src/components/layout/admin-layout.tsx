"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useAuth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/reset-password", "/app/approval"];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicPage = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Redirect to login if not authenticated (and not on a public page)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicPage) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, isPublicPage, router]);

  // Public pages — render without layout
  if (isPublicPage) {
    return <>{children}</>;
  }

  // While checking auth, show a minimal loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-xl animate-pulse">
            M
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Memuat...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render (redirect will happen via useEffect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen relative overflow-x-hidden">
          <Topbar />
          <main className="flex-1 pt-[calc(128px+env(safe-area-inset-top))] lg:pt-8 px-4 lg:px-8 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8 relative z-10 w-full max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
