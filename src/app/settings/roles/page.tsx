"use client";

import { useState, useEffect } from "react";
import { Shield, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: Record<string, string>;
  _count?: { users: number };
}

const permLabel: Record<string, { label: string; color: string }> = {
  full:  { label: "Full",  color: "text-emerald-600 bg-emerald-500/10" },
  edit:  { label: "Edit",  color: "text-blue-600 bg-blue-500/10" },
  view:  { label: "View",  color: "text-amber-600 bg-amber-500/10" },
  none:  { label: "—",     color: "text-muted-foreground bg-surface-hover" },
};

const MODULES = ["spk", "monitoring", "pembayaran", "laporan", "settings", "master"];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = () => {
    setLoading(true);
    setError(null);
    api.get<Role[]>("/settings/roles")
      .then(res => setRoles(res.data || []))
      .catch(e => setError(e.message || "Gagal memuat roles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRoles(); }, []);

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Shield className="text-primary" size={24} /> Role &amp; Akses</h1>
          <p className="text-muted-foreground text-sm">Daftar role dan hak akses tiap level pengguna.</p>
        </div>
      </div>

      {error && (
        <div className="glass-panel p-4 flex items-center gap-3 border border-red-500/20 bg-red-500/5 text-red-500">
          <AlertTriangle size={18} />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={fetchRoles} className="text-xs px-3 py-1 border border-red-500/30 rounded-lg hover:bg-red-500/10">Coba Lagi</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : roles.length === 0 ? (
        <div className="glass-panel p-10 text-center text-muted-foreground">Belum ada data role</div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="glass-panel p-4 lg:p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm lg:text-base">{role.name}</h3>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">
                    {role.description || "—"} &nbsp;·&nbsp; {role._count?.users ?? 0} user
                  </p>
                </div>
              </div>
              {role.permissions && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {MODULES.map(mod => {
                    const val = role.permissions?.[mod] || "none";
                    const theme = permLabel[val] || permLabel.none;
                    return (
                      <div key={mod} className="text-center">
                        <p className="text-[9px] text-muted-foreground uppercase font-medium mb-1">{mod}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${theme.color}`}>{theme.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">Manajemen role lanjutan dilakukan melalui database. Hubungi administrator sistem.</p>
    </div>
  );
}
