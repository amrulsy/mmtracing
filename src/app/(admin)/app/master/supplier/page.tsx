"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Phone, MapPin, Edit, Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface Supplier {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  _count?: {
    sparepart: number;
  };
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  // Quick Add Modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit Modal State
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { limit: "100" };
    if (searchDebounced) params.search = searchDebounced;

    api.getPaginated<Supplier>("/supplier", params)
      .then(res => setSuppliers(res.data))
      .catch(err => setError(err instanceof Error ? err.message : "Gagal memuat supplier"))
      .finally(() => setLoading(false));
  }, [searchDebounced]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number, nama: string) => {
    toast.confirm(`Hapus supplier "${nama}"? Semua relasi sparepart akan terlepas.`, async () => {
      setDeleting(id);
      try {
        await api.delete(`/supplier/${id}`);
        toast.success("Berhasil", `Supplier "${nama}" berhasil dihapus`);
        fetchData();
      } catch (err: unknown) {
        toast.error("Gagal", err instanceof Error ? err.message : "Gagal menghapus supplier");
      } finally { setDeleting(null); }
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editName) return;
    setEditing(true);
    try {
      await api.patch(`/supplier/${editTarget.id}`, {
        name: editName,
        phone: editPhone || undefined,
        address: editAddress || undefined,
      });
      toast.success("Berhasil", "Data supplier berhasil diperbarui");
      setEditTarget(null);
      fetchData();
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Gagal memperbarui supplier");
    } finally { setEditing(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return toast.error("Nama supplier wajib diisi");
    setAdding(true);
    try {
      await api.post("/supplier", { name: newName, phone: newPhone || undefined, address: newAddress || undefined });
      toast.success("Berhasil", "Supplier baru ditambahkan");
      setShowAdd(false);
      setNewName(""); setNewPhone(""); setNewAddress("");
      fetchData();
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Gagal menambah supplier");
    } finally { setAdding(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Supplier / Vendor</h1>
          <p className="text-muted-foreground">Kelola data supplier untuk pembelian sparepart dan material.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 btn-glossy bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark">
          <Plus size={20} /> Tambah Supplier
        </button>
      </div>

      <div className="glass-panel p-3 flex items-center gap-2">
        <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-surface-border flex-1 focus-within:ring-1 focus-within:ring-primary">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau telepon..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
        </div>
      </div>

      {error ? (
        <div className="glass-panel p-8 text-center text-red-500">{error}</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-panel p-5"><Skeleton className="h-24 w-full" /></div>
            ))
          ) : suppliers.length === 0 ? (
            <div className="glass-panel p-8 text-center text-muted-foreground md:col-span-2">Tidak ada data supplier</div>
          ) : (
            suppliers.map((s) => (
              <div key={s.id} className="glass-panel p-5 hover:-translate-y-1 hover:shadow-glossy transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{s.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditTarget(s); setEditName(s.name); setEditPhone(s.phone || ""); setEditAddress(s.address || ""); }}
                      className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"
                      title="Edit supplier"
                    >
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id, s.name)} disabled={deleting === s.id}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 disabled:opacity-50">
                      {deleting === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm mb-4">
                  <p className="text-muted-foreground flex items-center gap-2"><Phone size={14} />{s.phone || "—"}</p>
                  <p className="text-muted-foreground flex items-center gap-2"><MapPin size={14} />{s.address || "—"}</p>
                </div>

                <div className="pt-3 border-t border-surface-border">
                  <div className="text-center p-2 rounded-lg bg-surface flex flex-col items-center justify-center">
                    <p className="text-xl font-bold text-primary">{s._count?.sparepart || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Sparepart Terdaftar</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold flex items-center gap-2"><Plus size={16} className="text-primary" /> Supplier Baru</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nama <span className="text-red-500">*</span></label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Contoh: PT Astra Honda Motor" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">No. Telepon</label>
                <input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Contoh: 021-5551234" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Alamat</label>
                <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Contoh: Jl. Industri No. 9" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" />
              </div>
              <button type="submit" disabled={adding || !newName} className="w-full mt-2 py-2.5 bg-primary text-white font-medium rounded-xl disabled:opacity-50 flex justify-center items-center gap-2">
                {adding ? <Loader2 size={16} className="animate-spin" /> : "Simpan Supplier"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold flex items-center gap-2"><Edit size={16} className="text-primary" /> Edit Supplier</h3>
              <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
            </div>
            <form onSubmit={handleEdit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nama <span className="text-red-500">*</span></label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">No. Telepon</label>
                <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="021-5551234" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Alamat</label>
                <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" />
              </div>
              <button type="submit" disabled={editing || !editName} className="w-full mt-2 py-2.5 bg-primary text-white font-medium rounded-xl disabled:opacity-50 flex justify-center items-center gap-2">
                {editing ? <Loader2 size={16} className="animate-spin" /> : "Simpan Perubahan"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
