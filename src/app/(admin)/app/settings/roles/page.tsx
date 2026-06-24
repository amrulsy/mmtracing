"use client";

import { useState, useEffect } from "react";
import { Shield, Loader2, AlertTriangle, Plus, Edit2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { Modal } from "@/components/ui/modal";
import type { Role } from "@/lib/types";

const permLabel: Record<string, { label: string; color: string }> = {
 full: { label: "Full", color: "text-emerald-600 bg-emerald-500/10" },
 edit: { label: "Edit", color: "text-blue-600 bg-blue-500/10" },
 view: { label: "View", color: "text-amber-600 bg-amber-500/10" },
 none: { label: "—", color: "text-muted-foreground bg-surface-hover" },
};

// MMT Modules fetched dynamically from the API
type Module = { key: string; label: string; description: string; };

export default function RolesPage() {
 const [roles, setRoles] = useState<(Role & { description?: string, _count?: { users: number } })[]>([]);
 const [modules, setModules] = useState<Module[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // Modal states
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingRole, setEditingRole] = useState<Role | null>(null);
 const [isSaving, setIsSaving] = useState(false);
 const [formData, setFormData] = useState({
 name: "",
 description: "",
 permissions: {} as Record<string, string>,
 });

 const fetchRolesAndModules = () => {
 setLoading(true);
 setError(null);
 Promise.all([
 api.get<any[]>("/settings/roles"),
 api.get<Module[]>("/settings/modules")
 ])
 .then(([rolesRes, modulesRes]) => {
 setRoles(rolesRes.data || []);
 setModules(modulesRes.data || []);
 })
 .catch(e => setError(e.message || "Gagal memuat roles"))
 .finally(() => setLoading(false));
 };

 useEffect(() => { fetchRolesAndModules(); }, []);

 const openAddModal = () => {
 setEditingRole(null);
 setFormData({
 name: "",
 description: "",
 permissions: modules.reduce((acc, mod) => ({ ...acc, [mod.key]: "none" }), {}),
 });
 setIsModalOpen(true);
 };

 const openEditModal = (role: Role & { description?: string }) => {
 setEditingRole(role);
 setFormData({
 name: role.name,
 description: role.description || "",
 permissions: role.permissions || {},
 });
 setIsModalOpen(true);
 };

 const handleDelete = async (id: number) => {
 if (!confirm("Hapus role ini? User yang memiliki role ini mungkin tidak bisa login jika role dihapus.")) return;
 try {
 await api.delete(`/settings/roles/${id}`);
 fetchRolesAndModules();
 } catch (e: any) {
 alert(e.message || "Gagal menghapus role");
 }
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSaving(true);
 try {
 if (editingRole) {
 await api.put(`/settings/roles/${editingRole.id}`, formData);
 } else {
 await api.post("/settings/roles", formData);
 }
 setIsModalOpen(false);
 fetchRolesAndModules();
 } catch (err: any) {
 alert(err.message || "Gagal menyimpan role");
 } finally {
 setIsSaving(false);
 }
 };

 const handlePermChange = (mod: string, val: string) => {
 setFormData(prev => ({
 ...prev,
 permissions: { ...prev.permissions, [mod]: val }
 }));
 };

 return (
 <>
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Shield className="text-primary" size={24} /> Role &amp; Akses</h1>
 <p className="text-muted-foreground text-sm">Manajemen role dan hak akses fitur aplikasi.</p>
 </div>
 <button onClick={openAddModal} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all">
 <Plus size={16} /> <span className="hidden sm:inline">Tambah Role</span>
 </button>
 </div>

 {error && (
 <div className="glass-panel p-4 flex items-center gap-3 border border-red-500/20 bg-red-500/5 text-red-500">
 <AlertTriangle size={18} />
 <p className="text-sm flex-1">{error}</p>
 <button onClick={fetchRolesAndModules} className="text-xs px-3 py-1 border border-red-500/30 rounded-lg hover:bg-red-500/10">Coba Lagi</button>
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
 <div key={role.id} className="glass-panel p-4 lg:p-5 relative group">
 <div className="flex items-start justify-between mb-3">
 <div>
 <h3 className="font-bold text-sm lg:text-base flex items-center gap-2">
 {role.name}
 {role.name === "Admin" && <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/10 text-red-500 uppercase tracking-widest font-bold">Protected</span>}
 </h3>
 <p className="text-[10px] lg:text-xs text-muted-foreground">
 {role.description || "—"} &nbsp;·&nbsp; {role._count?.users ?? 0} user
 </p>
 </div>
 {role.name !== "Admin" && (
 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => openEditModal(role)} className="p-1.5 rounded bg-surface-hover text-muted-foreground hover:text-foreground">
 <Edit2 size={14} />
 </button>
 <button onClick={() => handleDelete(role.id)} className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20">
 <Trash2 size={14} />
 </button>
 </div>
 )}
 </div>
 {role.permissions && (
 <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
 {modules.map(mod => {
 const val = role.name === "Admin" ? "full" : (role.permissions?.[mod.key] || "none");
 const theme = permLabel[val] || permLabel.none;
 return (
 <div key={mod.key} className="text-center p-2 rounded-xl bg-surface" title={mod.description}>
 <p className="text-[9px] text-muted-foreground uppercase font-medium mb-1">{mod.label}</p>
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

 {/* Modal Form */}
 <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRole ? "Edit Role" : "Tambah Role"} size="lg">
 <form onSubmit={handleSave} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-1">Nama Role</label>
 <input
 autoFocus
 required
 type="text"
 value={formData.name}
 onChange={e => setFormData({ ...formData, name: e.target.value })}
 className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder="Misal: Mekanik Senior"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-1">Deskripsi</label>
 <input
 type="text"
 value={formData.description}
 onChange={e => setFormData({ ...formData, description: e.target.value })}
 className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder="Penjelasan singkat peran ini"
 />
 </div>
 </div>

 <div className="pt-2">
 <h4 className="text-sm font-bold mb-3 border-b border-surface-border pb-2">Konfigurasi Hak Akses</h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
 {modules.map(mod => (
 <div key={mod.key} className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-surface-border/50" title={mod.description}>
 <span className="text-xs font-medium">{mod.label}</span>
 <select
 value={formData.permissions[mod.key] || "none"}
 onChange={e => handlePermChange(mod.key, e.target.value)}
 className="bg-background border border-surface-border rounded text-xs px-2 py-1 outline-none"
 >
 <option value="none">None (Tidak ada akses)</option>
 <option value="view">View (Hanya lihat)</option>
 <option value="edit">Edit (Tambah/Ubah)</option>
 <option value="full">Full (Termasuk Hapus)</option>
 </select>
 </div>
 ))}
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm rounded-xl hover:bg-surface-hover text-muted-foreground transition-colors">
 Batal
 </button>
 <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
 {isSaving && <Loader2 size={16} className="animate-spin" />}
 {isSaving ? "Menyimpan..." : "Simpan"}
 </button>
 </div>
 </form>
 </Modal>
 </>
 );
}
