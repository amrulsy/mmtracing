"use client";

import { useAuth } from "@/lib/auth";

const PERMISSION_LEVELS: Record<string, number> = {
  none: 0,
  view: 1,
  edit: 2,
  full: 3
};

/**
 * Hook to check the current user's role and permissions for UI guards.
 */
export function useRole() {
  const { user } = useAuth();
  const roleName = user?.roleName?.toLowerCase() ?? "";
  const permissions = user?.permissions || {};

  const isSuperAdmin = roleName === "admin"; // Match backend bypass

  // Helper to check if a user has at least a specific level on a module
  const hasAccess = (moduleName: string, minLevel: "view" | "edit" | "full" = "view") => {
    if (isSuperAdmin) return true; // Admin bypass
    const userLevelStr = permissions[moduleName] || "none";
    const userLevel = PERMISSION_LEVELS[userLevelStr] || 0;
    const requiredLevel = PERMISSION_LEVELS[minLevel] || 0;
    return userLevel >= requiredLevel;
  };

  return {
    role: roleName,
    isAdmin: isSuperAdmin,
    
    // Dynamic permission checks
    isKasir: hasAccess("pembayaran", "edit"),
    isMekanik: hasAccess("monitoring", "edit"),
    isFrontdesk: hasAccess("wo", "edit"),
    
    canManageSpk: hasAccess("wo", "edit"),
    canProcessPayment: hasAccess("pembayaran", "edit"),
    
    // Destructive actions usually require "full" access to master or wo
    canDestructive: isSuperAdmin || hasAccess("master", "full") || hasAccess("wo", "full"),
    
    // Expose hasAccess for component-level checks
    hasAccess,
  };
}
