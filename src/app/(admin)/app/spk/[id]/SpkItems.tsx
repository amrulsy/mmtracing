"use client";

import { useState } from "react";
import { Package, Plus, CheckCircle2, Clock, Trash2, Loader2, AlertCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Spk, Sparepart, Jasa } from "@/lib/types";

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

interface SpkItemsProps {
 spk: Spk;
 id: string;
 fetchSpk: () => Promise<void>;
 togglingId: string;
 handleToggleItem: (itemId: number, currentStatus: string) => Promise<void>;
}

export function SpkItems({ spk, id, fetchSpk, togglingId, handleToggleItem }: SpkItemsProps) {
 const [showAddItem, setShowAddItem] = useState(false);
 const [newItem, setNewItem] = useState({ type: "jasa" as "jasa" | "sparepart", sparepartId: "", jasaId: "", nama: "", qty: 1, hargaSatuan: 0 });
 const [sparepartList, setSparepartList] = useState<Sparepart[]>([]);
 const [jasaList, setJasaList] = useState<Jasa[]>([]);
 const [addItemSaving, setAddItemSaving] = useState(false);

 const totalBiayaItems = (spk.items || []).reduce((s, i) => s + i.subtotal, 0);

 const openAddItem = async () => {
 setNewItem({ type: "jasa", sparepartId: "", jasaId: "", nama: "", qty: 1, hargaSatuan: 0 });
 if (sparepartList.length === 0) {
 try {
 const res = await api.getPaginated<Sparepart>("/sparepart", { limit: 200 });
 setSparepartList(res.data);
 } catch { /* silent */ }
 }
 if (jasaList.length === 0) {
 try {
 const res = await api.getPaginated<Jasa>("/jasa", { limit: 200 });
 setJasaList(res.data);
 } catch { /* silent */ }
 }
 setShowAddItem(true);
 };

 const handleAddItem = async () => {
 if (!newItem.nama.trim() || newItem.hargaSatuan < 0 || newItem.qty < 1) {
 return toast.error("Wajib Diisi", "Nama, qty, dan harga wajib diisi dengan benar.");
 }
 setAddItemSaving(true);
 try {
 const payload: Record<string, unknown> = {
 type: newItem.type,
 nama: newItem.nama.trim(),
 qty: newItem.qty,
 hargaSatuan: newItem.hargaSatuan,
 };
 if (newItem.type === "sparepart" && newItem.sparepartId) payload.sparepartId = Number(newItem.sparepartId);
 if (newItem.type === "jasa" && newItem.jasaId) payload.jasaId = Number(newItem.jasaId);
 await api.post(`/spk/${id}/items`, payload);
 await fetchSpk();
 toast.success("Berhasil", "Item ditambahkan");
 setShowAddItem(false);
 } catch (err: unknown) {
 toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
 } finally {
 setAddItemSaving(false);
 }
 };

 const handleRemoveItem = async (itemId: number, itemName: string) => {
 toast.confirm(`Hapus item "${itemName}"?`, async () => {
 try {
 await api.delete(`/spk/${id}/items/${itemId}`);
 await fetchSpk();
 toast.success("Dihapus");
 } catch (err: unknown) {
 toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
 }
 });
 };

 if (!(spk.items && spk.items.length > 0) && !(spk.mode === "rutin" && spk.status !== "selesai" && spk.status !== "dibatalkan")) {
 return null;
 }

 return (
 <>
 <div className="glass-panel overflow-hidden">
 <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Package size={12} />Item Pekerjaan</h3>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-primary">{fmt(totalBiayaItems)}</span>
 {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
 <button
 onClick={openAddItem}
 className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg flex items-center gap-1"
 aria-label="Tambah item"
 >
 <Plus size={11} /> Tambah
 </button>
 )}
 </div>
 </div>
 {(spk.items || []).length === 0 ? (
 <div className="py-6 text-center text-xs text-muted-foreground">Belum ada item.</div>
 ) : (
 <div className="divide-y divide-surface-border">
 {(spk.items || []).map(item => (
 <div key={item.id} className="flex items-center gap-3 px-4 py-3">
 <button
 type="button"
 onClick={() => spk.status !== "selesai" && spk.status !== "dibatalkan" && handleToggleItem(item.id, item.status ?? "pending")}
 disabled={spk.status === "selesai" || spk.status === "dibatalkan" || togglingId === `item-${item.id}`}
 className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${item.status === "done" ? "bg-emerald-500 text-white" : "bg-surface-hover text-muted-foreground border border-surface-border hover:border-emerald-500"} disabled:opacity-60 disabled:cursor-not-allowed`}
 aria-label={item.status === "done" ? "Batalkan tanda selesai" : "Tandai selesai"}
 title={item.status === "done" ? "Tandai belum selesai" : "Tandai selesai"}
 >
 {togglingId === `item-${item.id}` ? <Loader2 size={12} className="animate-spin" /> : item.status === "done" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
 </button>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate">{item.nama}</p>
 <p className="text-[10px] text-muted-foreground capitalize">{item.type}</p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-bold">{fmt(item.subtotal)}</p>
 <p className="text-[10px] text-muted-foreground">{fmt(item.hargaSatuan)} × {item.qty}</p>
 </div>
 {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
 <button
 onClick={() => handleRemoveItem(item.id, item.nama)}
 className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
 aria-label={`Hapus ${item.nama}`}
 >
 <Trash2 size={12} />
 </button>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {showAddItem && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
 <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
 <div className="p-4 border-b border-surface-border flex justify-between items-center">
 <h3 className="font-bold flex items-center gap-2"><Plus size={16} /> Tambah Item</h3>
 <button onClick={() => setShowAddItem(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
 </div>
 <form onSubmit={(e) => { e.preventDefault(); handleAddItem(); }} className="p-5 space-y-4">
 <div className="flex gap-1 bg-surface-hover rounded-lg border border-surface-border p-0.5">
 {(["jasa", "sparepart"] as const).map(t => (
 <button key={t} type="button" onClick={() => setNewItem({ ...newItem, type: t, sparepartId: "", jasaId: "", nama: "", hargaSatuan: 0 })}
 className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${newItem.type === t ? "bg-background shadow text-foreground border border-surface-border" : "text-muted-foreground"}`}>
 {t === "jasa" ? "🔧 Jasa" : "📦 Sparepart"}
 </button>
 ))}
 </div>

 {newItem.type === "sparepart" && (
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Pilih Sparepart</label>
 <select
 value={newItem.sparepartId}
 onChange={e => {
 const sp = sparepartList.find(x => x.id === Number(e.target.value));
 setNewItem({
 ...newItem,
 sparepartId: e.target.value,
 nama: sp?.name || newItem.nama,
 hargaSatuan: sp?.hargaJual ? Number(sp.hargaJual) : newItem.hargaSatuan,
 });
 }}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="">— Pilih dari master —</option>
 {sparepartList.map(sp => (
 <option key={sp.id} value={sp.id} disabled={(sp.stok ?? 0) < 1}>
 {sp.name} (stok: {sp.stok ?? 0})
 </option>
 ))}
 </select>
 {newItem.sparepartId && (() => {
 const sp = sparepartList.find(x => x.id === Number(newItem.sparepartId));
 if (sp && newItem.qty > (sp.stok ?? 0)) {
 return <p className="text-xs text-red-600 flex items-center gap-1 mt-1"><AlertCircle size={11} /> Qty melebihi stok tersedia ({sp.stok ?? 0})</p>;
 }
 return null;
 })()}
 </div>
 )}

 {newItem.type === "jasa" && (
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Pilih Jasa (opsional)</label>
 <select
 value={newItem.jasaId}
 onChange={e => {
 const j = jasaList.find(x => x.id === Number(e.target.value));
 setNewItem({
 ...newItem,
 jasaId: e.target.value,
 nama: j?.name || newItem.nama,
 hargaSatuan: j?.harga ? Number(j.harga) : newItem.hargaSatuan,
 });
 }}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="">— Custom / pilih dari master —</option>
 {jasaList.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
 </select>
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Nama Item <span className="text-red-500">*</span></label>
 <input type="text" value={newItem.nama} onChange={e => setNewItem({ ...newItem, nama: e.target.value })} required
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Qty</label>
 <input type="number" min="1" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: Math.max(1, Number(e.target.value)) })}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Harga Satuan</label>
 <input type="number" min="0" value={newItem.hargaSatuan} onChange={e => setNewItem({ ...newItem, hargaSatuan: Math.max(0, Number(e.target.value)) })}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 </div>

 <p className="text-xs text-muted-foreground">Subtotal: <span className="font-bold text-primary">{fmt(newItem.qty * newItem.hargaSatuan)}</span></p>

 <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
 <button type="button" onClick={() => setShowAddItem(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
 <button type="submit" disabled={addItemSaving} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
 {addItemSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
 Tambah
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </>
 );
}
