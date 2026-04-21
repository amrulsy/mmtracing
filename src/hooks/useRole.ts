"use client";

import { useAuth } from "@/lib/auth";

/**
 * Hook to check the current user's role for UI guards.
 * Uses roleName from the Auth context.
 */
export function useRole() {
  const { user } = useAuth();
  const role = user?.roleName?.toLowerCase() ?? "";

  return {
    role,
    isAdmin: role === "admin" || role === "owner",
    isKasir: role === "kasir",
    isMekanik: role === "mekanik",
    isFrontdesk: role === "frontdesk",
    /** Can manage SPK status changes */
    canManageSpk: ["admin", "owner", "frontdesk"].includes(role),
    /** Can process payments */
    canProcessPayment: ["admin", "owner", "kasir"].includes(role),
    /** Can perform destructive actions (refund, delete, cancel) */
    canDestructive: ["admin", "owner"].includes(role),
  };
}
