"use client";

import { useState } from "react";
import { Key, Save, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

export default function KeamananPage() {
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword)
      return toast.error("Validasi", "Semua field wajib diisi");
    if (form.newPassword.length < 8)
      return toast.error("Validasi", "Password baru minimal 8 karakter");
    if (form.newPassword !== form.confirmPassword)
      return toast.error("Validasi", "Konfirmasi password tidak cocok");

    setSaving(true);
    try {
      await api.put("/auth/change-password", {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      toast.success("Berhasil", "Password berhasil diperbarui");
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e: unknown) {
      toast.error("Gagal", e instanceof Error ? e.message : "Password lama salah atau terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Key className="text-primary" size={24} /> Keamanan</h1>
        <p className="text-muted-foreground text-sm">Pengaturan password dan keamanan akun.</p>
      </div>

      {/* Change Password */}
      <div className="glass-panel p-4 lg:p-6">
        <h3 className="font-bold text-sm lg:text-base mb-4">🔑 Ganti Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Password Lama <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                value={form.oldPassword}
                onChange={e => setForm(f => ({ ...f, oldPassword: e.target.value }))}
                placeholder="Masukkan password lama"
                className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
              />
              <button type="button" onClick={() => setShowOld(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Password Baru <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Minimal 8 karakter"
                className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
              />
              <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {form.newPassword && form.newPassword.length < 8 && (
              <p className="text-[10px] text-red-500">Minimal 8 karakter</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Konfirmasi Password Baru <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Ulangi password baru"
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <p className="text-[10px] text-red-500">Password tidak cocok</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || !form.oldPassword || !form.newPassword || !form.confirmPassword || form.newPassword !== form.confirmPassword}
            className="flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-glossy-primary disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Memperbarui..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="glass-panel p-4 border border-amber-500/20 bg-amber-500/5">
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">💡 Tips Keamanan</p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc list-inside">
          <li>Gunakan minimal 8 karakter dengan kombinasi huruf dan angka</li>
          <li>Jangan gunakan password yang sama di aplikasi lain</li>
          <li>Ganti password secara berkala setiap 3 bulan</li>
        </ul>
      </div>
    </>
  );
}
