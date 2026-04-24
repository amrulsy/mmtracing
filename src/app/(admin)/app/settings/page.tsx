"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Save, Plus, Edit, Trash2, Loader2, X, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/loading-skeleton";



interface User {
  id: number;
  name: string;
  username: string;
  email?: string;
  roleId?: number;
  role?: { name: string };
  status: string;
}

interface BengkelProfile {
  NAMA_BENGKEL: string;
  NO_TELEPON: string;
  ALAMAT: string;
  NO_WHATSAPP: string;
  EMAIL_BENGKEL: string;
  NAMA_PEMILIK: string;
}

interface Role {
  id: number;
  name: string;
}

const emptyUser = { name: "", username: "", email: "", password: "", roleId: 0 };

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<BengkelProfile>({
    NAMA_BENGKEL: "", NO_TELEPON: "", ALAMAT: "", NO_WHATSAPP: "", EMAIL_BENGKEL: "", NAMA_PEMILIK: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState(emptyUser);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, pRes, rRes] = await Promise.all([
        api.get<User[]>("/settings/users"),
        api.get<{ bengkel: Record<string, string> }>("/settings/config"),
        api.get<Role[]>("/settings/roles"),
      ]);
      setUsers(uRes.data || []);
      setRoles(rRes.data || []);
      const cfg = pRes.data?.bengkel || {};
      setProfile({
        NAMA_BENGKEL: cfg.NAMA_BENGKEL || "MM Tracing",
        NO_TELEPON: cfg.NO_TELEPON || "",
        ALAMAT: cfg.ALAMAT || "",
        NO_WHATSAPP: cfg.NO_WHATSAPP || "",
        EMAIL_BENGKEL: cfg.EMAIL_BENGKEL || "",
        NAMA_PEMILIK: cfg.NAMA_PEMILIK || "",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put("/settings/profile", profile);
      toast.success("Disimpan", "Profil bengkel berhasil disimpan");
    } catch (e: unknown) {
      toast.error("Gagal", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ ...emptyUser, roleId: roles[0]?.id || 0 });
    setShowUserModal(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({ name: u.name, username: u.username, email: u.email || "", password: "", roleId: u.roleId || 0 });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (u: User) => {
    toast.confirm(
      `Hapus user "${u.name}"? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          await api.delete(`/settings/users/${u.id}`);
          toast.success("Dihapus", `User ${u.name} berhasil dihapus`);
          fetchData();
        } catch (e: unknown) {
          toast.error("Gagal", e instanceof Error ? e.message : "Terjadi kesalahan");
        }
      }
    );
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.username) return toast.error("Validasi", "Nama dan username wajib diisi");
    if (!editingUser && !userForm.password) return toast.error("Validasi", "Password wajib diisi untuk user baru");
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: userForm.name,
        username: userForm.username,
        email: userForm.email,
        roleId: Number(userForm.roleId),
      };
      if (userForm.password) payload.password = userForm.password;
      if (editingUser) {
        await api.put(`/settings/users/${editingUser.id}`, payload);
        toast.success("Diperbarui", `User ${userForm.name} berhasil diperbarui`);
      } else {
        await api.post("/settings/users", payload);
        toast.success("Ditambahkan", `User ${userForm.name} berhasil ditambahkan`);
      }
      setShowUserModal(false);
      fetchData();
    } catch (e: unknown) {
      toast.error("Gagal", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (u: User) => {
    const role = u.role?.name || "";
    if (role === "Admin" || role === "admin") return "bg-primary/10 text-primary border-primary/20";
    if (role === "sa" || role === "SA") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  };

  return (
    <>
      {error && (
            <div className="glass-panel p-4 flex items-center gap-3 border border-red-500/20 bg-red-500/5 text-red-500">
              <AlertTriangle size={18} />
              <p className="text-sm flex-1">{error}</p>
              <button onClick={fetchData} className="text-xs px-3 py-1 border border-red-500/30 rounded-lg hover:bg-red-500/10">Coba Lagi</button>
            </div>
          )}

          {/* User Management */}
          <div className="glass-panel p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div>
                <h2 className="text-base lg:text-lg font-bold flex items-center gap-2"><Users size={18} className="text-primary" /> Manajemen User</h2>
                <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">Kelola akun pengguna sistem.</p>
              </div>
              <button onClick={openAddUser} className="flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark">
                <Plus size={14} /> Tambah
              </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nama</th>
                    <th className="px-4 py-3 font-semibold">Username</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2" /> Memuat data...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data user.</td></tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className="bg-surface hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{u.name.charAt(0)}</div><span className="font-medium">{u.name}</span></div></td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.username}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRoleBadge(u)}`}>{u.role?.name || "—"}</span></td>
                      <td className="px-4 py-3"><span className={`w-2 h-2 rounded-full inline-block mr-2 ${u.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} /><span className="text-xs">{u.status === "active" ? "Aktif" : "Nonaktif"}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditUser(u)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground mr-1"><Edit size={14} /></button>
                        <button onClick={() => handleDeleteUser(u)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="lg:hidden space-y-2">
              {loading ? (
                <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
              ) : users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-border hover:bg-surface-hover/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{u.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground">@{u.username} · <span className={u.status === "active" ? "text-emerald-600" : "text-muted-foreground"}>{u.status === "active" ? "Aktif" : "Nonaktif"}</span></p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${getRoleBadge(u)}`}>{u.role?.name || "—"}</span>
                  <button onClick={() => openEditUser(u)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground"><Edit size={13} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Profil Bengkel */}
          <div className="glass-panel p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold mb-4">Profil Bengkel</h2>
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10 sm:col-span-2" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                {([
                  { key: "NAMA_BENGKEL" as const, label: "Nama Bengkel" },
                  { key: "NAMA_PEMILIK" as const, label: "Nama Pemilik" },
                  { key: "NO_TELEPON" as const, label: "No. Telepon" },
                  { key: "NO_WHATSAPP" as const, label: "No. WhatsApp" },
                  { key: "EMAIL_BENGKEL" as const, label: "Email Bengkel" },
                ] as const).map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                    <input type="text" value={profile[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                ))}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Alamat</label>
                  <textarea value={profile.ALAMAT} onChange={e => setProfile(p => ({ ...p, ALAMAT: e.target.value }))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[60px]" />
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={saveProfile} disabled={saving || loading} className="flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold flex items-center gap-2"><Users size={16} className="text-primary" /> {editingUser ? "Edit User" : "Tambah User Baru"}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input type="text" required value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Username <span className="text-red-500">*</span></label>
                  <input type="text" required value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Password {!editingUser && <span className="text-red-500">*</span>} {editingUser && <span className="text-muted-foreground">(kosongkan jika tidak diubah)</span>}</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} required={!editingUser} placeholder={editingUser ? "••••••••" : "Minimal 8 karakter"} minLength={editingUser ? undefined : 8} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10" />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select value={userForm.roleId} onChange={e => setUserForm(f => ({ ...f, roleId: Number(e.target.value) }))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={submitting} className="w-full mt-2 py-2.5 bg-primary text-white font-bold rounded-xl disabled:opacity-50 flex justify-center items-center gap-2 btn-glossy shadow-glossy-primary">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <>{editingUser ? <Save size={16} /> : <Plus size={16} />} {editingUser ? "Simpan Perubahan" : "Tambah User"}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
