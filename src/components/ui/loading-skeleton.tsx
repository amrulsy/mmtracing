"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-surface-hover/60",
        className
      )}
    />
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function TableRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-surface-border">
          <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
          <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
          <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
          <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
          <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
          <td className="px-6 py-4 text-right"><Skeleton className="h-5 w-12 ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-4 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <CardSkeleton count={4} />
      <div className="glass-panel p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <ListSkeleton count={5} />
      </div>
    </div>
  );
}
