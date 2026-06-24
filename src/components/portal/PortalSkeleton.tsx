"use client";

/** Reusable skeleton shimmer components for portal loading states */

export function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton rounded h-3"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = "w-12 h-12" }: { size?: string }) {
  return <div className={`skeleton rounded-2xl ${size}`} />;
}

export function SkeletonKPI() {
  return (
    <div className="glass-panel p-4 text-center space-y-2">
      <div className="skeleton rounded h-7 w-12 mx-auto" />
      <div className="skeleton rounded h-2.5 w-16 mx-auto" />
    </div>
  );
}

export function SkeletonCard({ height = "h-24" }: { height?: string }) {
  return <div className={`skeleton rounded-2xl ${height} w-full`} />;
}

export function SkeletonSpkCard() {
  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5 flex-1">
          <div className="skeleton rounded h-3.5 w-28" />
          <div className="skeleton rounded h-2.5 w-20" />
        </div>
        <div className="skeleton rounded-full h-5 w-16" />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <div className="skeleton rounded h-2 w-14" />
          <div className="skeleton rounded h-2 w-8" />
        </div>
        <div className="skeleton rounded-full h-1.5 w-full" />
      </div>
    </div>
  );
}

/** Full dashboard skeleton */
export function DashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-28 animate-in fade-in duration-300">
      {/* Profile header */}
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <SkeletonAvatar />
          <div className="space-y-2 flex-1">
            <div className="skeleton rounded h-6 w-48" />
            <div className="skeleton rounded h-3 w-36" />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>

      {/* Loyalty widget */}
      <SkeletonCard height="h-20" />

      {/* Quick action */}
      <SkeletonCard height="h-16" />

      {/* SPK list */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="skeleton rounded h-4 w-32" />
          <SkeletonSpkCard />
          <SkeletonSpkCard />
        </div>
        <div className="space-y-3">
          <div className="skeleton rounded h-4 w-24" />
          <SkeletonCard height="h-32" />
        </div>
      </div>
    </div>
  );
}
