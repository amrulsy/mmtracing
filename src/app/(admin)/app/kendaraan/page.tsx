"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Car, User, History, Edit, Hammer, CarFront, Trash2, Plus, X, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import type { Pelanggan, Kendaraan } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";

export default function KendaraanPage() {
  const { user } = useAuth();
  const isAdmin = user?.roleName === "Admin";
  const [tab, setTab] = useState("semua");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [customers, setCustomers] = useState<Pelanggan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);

  // Edit Modal
  const [showEdit, setShowEdit] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editData, setEditData] = useState<{name: string, phone: string, email: string, address: string}>({ name: "", phone: "", email: "", address: "" });

  // Add Kendaraan Modal
  const [showAddKen, setShowAddKen] = useState(false);
  const [newKenPlat, setNewKenPlat] = useState("");
  const [newKenName, setNewKenName] = useState("");
  const [addKenLoading, setAddKenLoading] = useState(false);

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { limit: 100 };
    if (tab !== "semua") params.type = tab;
    if (searchDebounced) params.search = searchDebounced;

    api.getPaginated<Pelanggan>("/pelanggan", params)
      .then((res) => {
        setCustomers(res.data);
        setTotal(res.pagination.total);
        setSelected(0); // Reset selection whenever filter changes
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data kendaraan"))
      .finally(() => setLoading(false));
  }, [tab, searchDebounced]);

  const active = customers[selected];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="text-primary text-sm font-medium hover:underline">Coba lagi</button>
      </div>
    );
  }

  const handleEditPelanggan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    setEditLoading(true);
    try {
      const res = await api.put<Pelanggan>(`/pelanggan/${active.id}`, editData);
      setCustomers(customers.map(c => c.id === active.id ? { ...c, ...res.data } : c));
      toast.success("Berhasil", "Data pelanggan diperbarui");
      setShowEdit(false);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddKendaraan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!newKenPlat.trim() || !newKenName.trim()) return toast.error("Wajib Diisi", "Plat dan nama kendaraan wajib diisi.");
    setAddKenLoading(true);
    try {
      const res = await api.post<Kendaraan>("/kendaraan", { pelangganId: active.id, plat: newKenPlat.toUpperCase(), name: newKenName });
      setCustomers(customers.map(c => c.id === active.id ? { ...c, kendaraan: [...(c.kendaraan || []), res.data] } : c));
      toast.success("Kendaraan Ditambahkan", `${newKenName} (${newKenPlat.toUpperCase()}) berhasil didaftarkan.`);
      setNewKenPlat(""); setNewKenName(""); setShowAddKen(false);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAddKenLoading(false);
    }
  };

  const handleDeletePelanggan = async () => {
    if (!active) return;
    toast.confirm(
      `Yakin ingin menghapus pelanggan "${active.name}"? Tindakan ini tidak bisa dibatalkan.`,
      async () => {
        setDeleteLoading(true);
        try {
          await api.delete(`/pelanggan/${active.id}`);
          const newList = customers.filter(c => c.id !== active.id);
          setCustomers(newList);
          setTotal(t => t - 1);
          setSelected(0);
          toast.success("Dihapus", `Pelanggan ${active.name} telah dihapus.`);
        } catch (err: unknown) {
          toast.error("Gagal Menghapus", err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
          setDeleteLoading(false);
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pelanggan & Kendaraan</h1>
          <p className="text-muted-foreground text-sm">Kelola database pelanggan — servis kendaraan maupun jasa bubut lepas.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/kendaraan/tambah" className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover font-medium">
            <Car size={16} /> + Pelanggan
          </Link>
          <Link href="/app/spk/create?mode=bubut" className="flex items-center gap-2 btn-glossy bg-primary text-primary-foreground px-3 py-2 rounded-xl font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark text-sm">
            <Hammer size={16} /> + SPK Bubut
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar List */}
        <div className="glass-panel lg:col-span-1 h-auto max-h-[50vh] lg:h-[calc(100vh-12rem)] lg:max-h-none flex flex-col overflow-hidden">
          <div className="p-3 border-b border-surface-border space-y-2">
            <div className="flex items-center gap-2 bg-surface-hover px-3 py-2 rounded-lg border border-surface-border focus-within:ring-1 focus-within:ring-primary transition-all">
              <Search size={18} className="text-muted-foreground" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari pelanggan..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
            </div>
            <div className="flex gap-1 bg-surface-hover rounded-lg border border-surface-border p-0.5">
              {[
                { key: "semua", label: "Semua" },
                { key: "kendaraan", label: "🚗 Kendaraan" },
                { key: "bubut", label: "🔧 Bubut" },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${tab === t.key ? "bg-background shadow text-foreground border border-surface-border" : "text-muted-foreground"}`}>{t.label}</button>
              ))}
            </div>
          </div>
          {/* Total count bar */}
          {!loading && (
            <div className="px-3 pb-1.5 pt-0.5 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">{total > 0 ? `${customers.length} dari ${total} pelanggan` : "Tidak ada hasil"}</p>
              {search && <button onClick={() => setSearch("")} className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><X size={10} />Hapus filter</button>}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                </div>
              ))
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data pelanggan</p>
            ) : (
              customers.map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => setSelected(i)}
                  className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${selected === i ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-hover border border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${selected === i ? 'bg-primary text-primary-foreground shadow-glossy-primary' : 'bg-surface-border text-muted-foreground'}`}>
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${selected === i ? 'text-primary' : ''}`}>{p.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {p.type === "bubut" ? <><Hammer size={10} /> Bubut Lepas</> :
                         p.type === "both" ? <><CarFront size={10} /> Kendaraan + Bubut</> :
                         <><CarFront size={10} /> {p.kendaraan?.[0]?.name || "Pelanggan"}</>}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6 lg:col-span-2">
          {!active ? (
            <div className="glass-panel p-12 text-center text-muted-foreground">
              <User size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Pilih pelanggan dari daftar di samping</p>
            </div>
          ) : (
            <>
              {/* Customer Info */}
              <div className="glass-panel p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><User size={100} className="text-primary" /></div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-glossy-primary">
                      {active.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl lg:text-2xl font-bold">{active.name}</h2>
                      <p className="text-muted-foreground flex items-center gap-2 mt-1 text-xs sm:text-sm flex-wrap">
                        {active.phone} {active.email && `• ${active.email}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          active.type === "bubut" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                          active.type === "both" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }`}>
                          {active.type === "bubut" ? "🔧 Bubut Lepas" : active.type === "both" ? "🚗🔧 Kendaraan + Bubut" : "🚗 Kendaraan"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => {
                    setEditData({ name: active.name, phone: active.phone, email: active.email || "", address: active.address || "" });
                    setShowEdit(true);
                  }} className="p-2 hover:bg-surface-hover rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Edit size={20} /></button>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-surface-border">
                  <div><p className="text-xs text-muted-foreground">Total Kendaraan</p><p className="text-lg font-semibold">{active.kendaraan?.length || 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Total SPK</p><p className="text-lg font-semibold">{active._count?.spk || 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status Loyalty</p><p className="text-lg font-semibold text-primary">{active.loyaltyTier?.name || "—"}</p></div>
                </div>
              </div>

              {/* Kendaraan Section */}
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Car size={20} className="text-primary" /> Garasi Kendaraan</h3>
                  {active.type !== "bubut" && (
                    <button onClick={() => setShowAddKen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus size={13} /> Tambah Kendaraan
                    </button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {(active.kendaraan || []).map((k) => (
                    <div key={k.id} className="border border-surface-border rounded-xl p-4 bg-surface-hover/30 hover:bg-surface-hover/60 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold">{k.name}</p>
                        <span className="px-2 py-0.5 bg-background border border-surface-border rounded text-xs font-medium font-mono">{k.plat}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        {k.tahun ? `Tahun ${k.tahun}` : ""} {k.warna ? `• Warna ${k.warna}` : ""}
                      </p>
                      <div className="flex gap-2">
                        <Link href={`/app/spk/create?pelangganId=${active.id}&kendaraanId=${k.id}`} className="flex-1 text-center text-xs bg-primary/10 text-primary hover:bg-primary/20 py-1.5 rounded-lg transition-colors border border-primary/20 font-medium">Buat SPK</Link>
                        <Link href={`/app/kendaraan/${k.id}`} className="flex-1 text-xs bg-surface border border-surface-border hover:bg-surface-hover py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 font-medium">
                          <History size={14} /> Detail
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                {(!active.kendaraan || active.kendaraan.length === 0) && (
                  <div className="text-center py-6 border border-dashed border-surface-border rounded-xl">
                    <p className="text-sm text-muted-foreground">Belum ada kendaraan terdaftar</p>
                  </div>
                )}
              </div>

              {/* Admin: Delete Button */}
              {isAdmin && (
                <div className="glass-panel p-4 border-red-500/20 border bg-red-500/3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-red-600">Hapus Pelanggan</p>
                      <p className="text-xs text-muted-foreground">Hanya dapat dilakukan jika tidak ada SPK aktif.</p>
                    </div>
                    <button onClick={handleDeletePelanggan} disabled={deleteLoading || (active._count?.spk ?? 0) > 0} className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none">
                      <Trash2 size={14} /> {deleteLoading ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                  {(active._count?.spk ?? 0) > 0 && <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle size={10} /> Pelanggan memiliki {active._count?.spk} riwayat SPK dan tidak dapat dihapus.</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showEdit && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/50">
              <h3 className="font-bold text-lg text-primary">Edit Profil Pelanggan</h3>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground"><AlertTriangle size={18} className="opacity-0" />✕</button>
            </div>
            <form onSubmit={handleEditPelanggan} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama Lengkap</label>
                <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} required className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">No. Telepon (WhatsApp)</label>
                <input type="text" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} required className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <input type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Alamat Domisili</label>
                <textarea rows={2} value={editData.address} onChange={e => setEditData({...editData, address: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button type="submit" disabled={editLoading} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all disabled:opacity-70">
                  {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddKen && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/50">
              <h3 className="font-bold text-lg text-primary">Tambah Kendaraan</h3>
              <button onClick={() => { setShowAddKen(false); setNewKenPlat(""); setNewKenName(""); }} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleAddKendaraan} className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Mendaftarkan kendaraan baru ke profil <span className="font-semibold text-foreground">{active.name}</span>.</p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nomor Polisi <span className="text-red-500">*</span></label>
                <input type="text" value={newKenPlat} onChange={e => setNewKenPlat(e.target.value)} required placeholder="AB 1234 CD" className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono uppercase" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama / Tipe Kendaraan <span className="text-red-500">*</span></label>
                <input type="text" value={newKenName} onChange={e => setNewKenName(e.target.value)} required placeholder="Honda Vario 150, Toyota Avanza, dll." className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setShowAddKen(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button type="submit" disabled={addKenLoading} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all disabled:opacity-70">
                  {addKenLoading ? "Menyimpan..." : "Tambah Kendaraan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
