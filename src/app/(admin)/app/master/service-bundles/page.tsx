"use client";

import { useState, useEffect, useCallback } from "react";
import {
 Search, Plus, Edit, Trash2, Loader2, Layers, Package,
 Wrench, Sparkles, X, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface BundleItem {
 type: "jasa" | "sparepart";
 id: number;
 qty: number;
}

interface ServiceBundle {
 id: string;
 name: string;
 description: string | null;
 icon: string;
 items: BundleItem[];
 estimasiWaktu: string | null;
 garansi: string | null;
 isActive: boolean;
 sortOrder: number;
 createdAt: string;
 updatedAt: string;
}

interface JasaOption { id: number; name: string; kode: string; harga: number }
interface SparepartOption { id: number; name: string; kode: string; hargaJual: number }

const ICON_OPTIONS = [
 { value: "general", label: "Umum", icon: <Package size={16} className="text-primary" /> },
 { value: "tuneup", label: "Tune Up", icon: <Wrench size={16} className="text-emerald-500" /> },
 { value: "cvt", label: "CVT", icon: <Sparkles size={16} className="text-purple-500" /> },
 { value: "rem", label: "Rem", icon: <div className="w-3.5 h-3.5 rounded-full border-2 border-red-500" /> },
 { value: "oli", label: "Oli", icon: <div className="w-3.5 h-3.5 rounded-full bg-amber-400" /> },
 { value: "mesin", label: "Mesin", icon: <div className="w-3.5 h-3.5 rounded bg-blue-500" /> },
];

function getIconElement(icon: string) {
 return ICON_OPTIONS.find(o => o.value === icon)?.icon ?? <Package size={16} className="text-primary" />;
}

export default function ServiceBundlesPage() {
 const [bundles, setBundles] = useState<ServiceBundle[]>([]);
 const [search, setSearch] = useState("");
 const [loading, setLoading] = useState(true);
 const [deleting, setDeleting] = useState<string | null>(null);
 const [toggling, setToggling] = useState<string | null>(null);

 // Modal state
 const [showModal, setShowModal] = useState(false);
 const [editTarget, setEditTarget] = useState<ServiceBundle | null>(null);
 const [saving, setSaving] = useState(false);

 // Form state
 const [formName, setFormName] = useState("");
 const [formDesc, setFormDesc] = useState("");
 const [formIcon, setFormIcon] = useState("general");
 const [formEstimasi, setFormEstimasi] = useState("");
 const [formGaransi, setFormGaransi] = useState("");
 const [formSortOrder, setFormSortOrder] = useState(0);
 const [formIsActive, setFormIsActive] = useState(true);
 const [formItems, setFormItems] = useState<BundleItem[]>([]);

 // Item picker
 const [jasaList, setJasaList] = useState<JasaOption[]>([]);
 const [sparepartList, setSparepartList] = useState<SparepartOption[]>([]);
 const [itemSearch, setItemSearch] = useState("");
 const [itemType, setItemType] = useState<"jasa" | "sparepart">("jasa");

 const fetchData = useCallback(async () => {
 setLoading(true);
 try {
 const res = await api.get<ServiceBundle[]>("/service-bundles");
 setBundles(Array.isArray(res.data) ? res.data : []);
 } catch {
 toast.error("Gagal memuat data paket servis");
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => { fetchData(); }, [fetchData]);

 // Load jasa & sparepart options when modal opens
 useEffect(() => {
 if (!showModal) return;
 api.getPaginated<JasaOption>("/jasa", { limit: 200 })
 .then(res => setJasaList(res.data || []))
 .catch(() => {});
 api.getPaginated<SparepartOption>("/sparepart", { limit: 200 })
 .then(res => setSparepartList(res.data || []))
 .catch(() => {});
 }, [showModal]);

 const openCreate = () => {
 setEditTarget(null);
 setFormName(""); setFormDesc(""); setFormIcon("general");
 setFormEstimasi(""); setFormGaransi(""); setFormSortOrder(0);
 setFormIsActive(true); setFormItems([]);
 setShowModal(true);
 };

 const openEdit = (b: ServiceBundle) => {
 setEditTarget(b);
 setFormName(b.name); setFormDesc(b.description || "");
 setFormIcon(b.icon); setFormEstimasi(b.estimasiWaktu || "");
 setFormGaransi(b.garansi || ""); setFormSortOrder(b.sortOrder);
 setFormIsActive(b.isActive); setFormItems([...b.items]);
 setShowModal(true);
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formName.trim()) return toast.error("Nama paket wajib diisi");
 if (formItems.length === 0) return toast.error("Minimal 1 item wajib ditambahkan");

 setSaving(true);
 try {
 const body = {
 name: formName.trim(),
 description: formDesc.trim() || undefined,
 icon: formIcon,
 items: formItems,
 estimasiWaktu: formEstimasi.trim() || undefined,
 garansi: formGaransi.trim() || undefined,
 isActive: formIsActive,
 sortOrder: formSortOrder,
 };

 if (editTarget) {
 await api.put(`/service-bundles/${editTarget.id}`, body);
 toast.success("Berhasil", "Paket servis berhasil diperbarui");
 } else {
 await api.post("/service-bundles", body);
 toast.success("Berhasil", "Paket servis baru berhasil dibuat");
 }
 setShowModal(false);
 fetchData();
 } catch (err: unknown) {
 toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
 } finally {
 setSaving(false);
 }
 };

 const handleDelete = (b: ServiceBundle) => {
 toast.confirm(`Hapus paket "${b.name}"?`, async () => {
 setDeleting(b.id);
 try {
 await api.delete(`/service-bundles/${b.id}`);
 toast.success("Berhasil", `Paket "${b.name}" berhasil dihapus`);
 fetchData();
 } catch (err: unknown) {
 toast.error("Gagal", err instanceof Error ? err.message : "Gagal menghapus");
 } finally {
 setDeleting(null);
 }
 });
 };

 const handleToggleActive = async (b: ServiceBundle) => {
 setToggling(b.id);
 try {
 await api.put(`/service-bundles/${b.id}`, { isActive: !b.isActive });
 toast.success("Berhasil", `Paket "${b.name}" ${!b.isActive ? "diaktifkan" : "dinonaktifkan"}`);
 fetchData();
 } catch (err: unknown) {
 toast.error("Gagal", err instanceof Error ? err.message : "Gagal mengubah status");
 } finally {
 setToggling(null);
 }
 };

 const addItem = (type: "jasa" | "sparepart", id: number) => {
 setFormItems(prev => {
 const exists = prev.find(i => i.type === type && i.id === id);
 if (exists) return prev.map(i => i.type === type && i.id === id ? { ...i, qty: i.qty + 1 } : i);
 return [...prev, { type, id, qty: 1 }];
 });
 };

 const removeItem = (type: string, id: number) => {
 setFormItems(prev => prev.filter(i => !(i.type === type && i.id === id)));
 };

 const updateItemQty = (type: string, id: number, qty: number) => {
 if (qty < 1) return removeItem(type, id);
 setFormItems(prev => prev.map(i => i.type === type && i.id === id ? { ...i, qty } : i));
 };

 const getItemName = (type: string, id: number): string => {
 if (type === "jasa") return jasaList.find(j => j.id === id)?.name ?? `Jasa #${id}`;
 return sparepartList.find(s => s.id === id)?.name ?? `Sparepart #${id}`;
 };

 const filtered = bundles.filter(b =>
 b.name.toLowerCase().includes(search.toLowerCase()) ||
 (b.description || "").toLowerCase().includes(search.toLowerCase())
 );

 return (
 <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Paket Servis</h1>
 <p className="text-muted-foreground text-sm">Kelola paket bundling jasa dan sparepart untuk mempercepat pembuatan SPK.</p>
 </div>
 <button onClick={openCreate} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:">
 <Plus size={16} /> Tambah Paket
 </button>
 </div>

 {/* Search */}
 <div className="glass-panel p-3 flex items-center gap-2">
 <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-surface-border flex-1 focus-within:ring-1 focus-within:ring-primary">
 <Search size={16} className="text-muted-foreground shrink-0" />
 <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari paket servis..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
 </div>
 </div>

 {/* Grid */}
 {loading ? (
 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="glass-panel p-5"><Skeleton className="h-28 w-full" /></div>
 ))}
 </div>
 ) : filtered.length === 0 ? (
 <div className="glass-panel p-12 text-center">
 <Layers size={48} className="mx-auto mb-3 text-muted-foreground/30" />
 <p className="text-muted-foreground text-sm">{search ? "Tidak ada paket yang cocok" : "Belum ada paket servis"}</p>
 {!search && <p className="text-muted-foreground text-xs mt-1">Klik &quot;Tambah Paket&quot; untuk membuat paket baru</p>}
 </div>
 ) : (
 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filtered.map(b => (
 <div key={b.id} className={`glass-panel p-5 hover:-translate-y-1 hover:shadow-glossy transition-all group relative ${!b.isActive ? "opacity-60" : ""}`}>
 {!b.isActive && (
 <span className="absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">Nonaktif</span>
 )}
 <div className="flex items-start gap-3 mb-3">
 <div className="w-10 h-10 rounded-xl bg-surface border border-surface-border flex items-center justify-center shrink-0">
 {getIconElement(b.icon)}
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{b.name}</h3>
 <p className="text-[10px] text-muted-foreground line-clamp-1">{b.description || "Tanpa deskripsi"}</p>
 </div>
 </div>

 <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
 <span className="font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{b.items.length} item</span>
 {b.estimasiWaktu && <span>⏱️ {b.estimasiWaktu}</span>}
 {b.garansi && <span>✓ {b.garansi}</span>}
 </div>

 {/* Item list preview */}
 <div className="space-y-1 mb-3">
 {b.items.slice(0, 3).map((item, idx) => (
 <div key={idx} className="flex items-center gap-2 text-[10px] py-0.5 px-2 bg-surface-hover/50 rounded-md">
 <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'jasa' ? 'bg-primary' : 'bg-blue-500'}`} />
 <span className="flex-1 truncate capitalize">{item.type} #{item.id}</span>
 <span className="text-muted-foreground">×{item.qty}</span>
 </div>
 ))}
 {b.items.length > 3 && (
 <p className="text-[9px] text-muted-foreground text-center">+{b.items.length - 3} item lainnya</p>
 )}
 </div>

 <div className="pt-3 border-t border-surface-border flex items-center justify-between">
 <button
 onClick={() => handleToggleActive(b)}
 disabled={toggling === b.id}
 className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
 title={b.isActive ? "Nonaktifkan" : "Aktifkan"}
 >
 {toggling === b.id ? <Loader2 size={14} className="animate-spin" /> :
 b.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />
 }
 </button>
 <div className="flex gap-1">
 <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground" title="Edit">
 <Edit size={14} />
 </button>
 <button onClick={() => handleDelete(b)} disabled={deleting === b.id}
 className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 disabled:opacity-50" title="Hapus">
 {deleting === b.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Create/Edit Modal */}
 {showModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
 <div className="bg-background border border-surface-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
 <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30 shrink-0">
 <h3 className="font-bold flex items-center gap-2">
 <Layers size={16} className="text-primary" />
 {editTarget ? "Edit Paket Servis" : "Paket Servis Baru"}
 </h3>
 <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
 </div>
 <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
 {/* Name */}
 <div className="space-y-1">
 <label className="text-xs font-medium text-muted-foreground">Nama Paket <span className="text-red-500">*</span></label>
 <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contoh: Tune Up Ringan" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" autoFocus />
 </div>

 {/* Description */}
 <div className="space-y-1">
 <label className="text-xs font-medium text-muted-foreground">Deskripsi</label>
 <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Deskripsi singkat" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" />
 </div>

 {/* Icon & Sort */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-medium text-muted-foreground">Ikon</label>
 <select value={formIcon} onChange={e => setFormIcon(e.target.value)} className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50">
 {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
 </select>
 </div>
 <div className="space-y-1">
 <label className="text-xs font-medium text-muted-foreground">Urutan</label>
 <input type="number" value={formSortOrder} onChange={e => setFormSortOrder(Number(e.target.value))} min={0} className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" />
 </div>
 </div>

 {/* Estimasi & Garansi */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-medium text-muted-foreground">Estimasi Waktu</label>
 <input type="text" value={formEstimasi} onChange={e => setFormEstimasi(e.target.value)} placeholder="30-45 menit" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-medium text-muted-foreground">Garansi</label>
 <input type="text" value={formGaransi} onChange={e => setFormGaransi(e.target.value)} placeholder="7 hari" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" />
 </div>
 </div>

 {/* Items */}
 <div className="space-y-2">
 <label className="text-xs font-medium text-muted-foreground">Item Paket <span className="text-red-500">*</span></label>

 {formItems.length > 0 && (
 <div className="space-y-1.5 mb-2">
 {formItems.map((item, idx) => (
 <div key={`${item.type}-${item.id}-${idx}`} className="flex items-center gap-2 text-xs p-2 bg-surface rounded-lg border border-surface-border">
 <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'jasa' ? 'bg-primary' : 'bg-blue-500'}`} />
 <span className="flex-1 truncate">{getItemName(item.type, item.id)}</span>
 <div className="flex items-center gap-1">
 <button type="button" onClick={() => updateItemQty(item.type, item.id, item.qty - 1)} className="w-5 h-5 rounded bg-surface-hover flex items-center justify-center text-xs hover:bg-surface-hover/80">
 <ChevronDown size={12} />
 </button>
 <span className="w-6 text-center font-bold">{item.qty}</span>
 <button type="button" onClick={() => updateItemQty(item.type, item.id, item.qty + 1)} className="w-5 h-5 rounded bg-surface-hover flex items-center justify-center text-xs hover:bg-surface-hover/80">
 <ChevronUp size={12} />
 </button>
 </div>
 <button type="button" onClick={() => removeItem(item.type, item.id)} className="p-1 hover:text-red-500 text-muted-foreground">
 <X size={12} />
 </button>
 </div>
 ))}
 </div>
 )}

 {/* Add item picker */}
 <div className="border border-dashed border-surface-border rounded-xl p-3 space-y-2">
 <div className="flex gap-1">
 <button type="button" onClick={() => setItemType("jasa")} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${itemType === "jasa" ? "bg-primary text-white" : "bg-surface-hover text-muted-foreground"}`}>Jasa</button>
 <button type="button" onClick={() => setItemType("sparepart")} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${itemType === "sparepart" ? "bg-blue-500 text-white" : "bg-surface-hover text-muted-foreground"}`}>Sparepart</button>
 </div>
 <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder={`Cari ${itemType}...`} className="w-full bg-surface rounded-lg px-2.5 py-1.5 text-xs border focus:ring-1 focus:ring-primary/50" />
 <div className="max-h-32 overflow-y-auto space-y-0.5">
 {itemType === "jasa" ? (
 jasaList
 .filter(j => !itemSearch || j.name.toLowerCase().includes(itemSearch.toLowerCase()) || j.kode.toLowerCase().includes(itemSearch.toLowerCase()))
 .slice(0, 20)
 .map(j => (
 <button type="button" key={j.id} onClick={() => addItem("jasa", j.id)}
 className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-hover text-xs transition-colors">
 <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
 <span className="flex-1 truncate">{j.name}</span>
 <span className="text-[10px] text-muted-foreground font-mono">{j.kode}</span>
 </button>
 ))
 ) : (
 sparepartList
 .filter(s => !itemSearch || s.name.toLowerCase().includes(itemSearch.toLowerCase()) || s.kode.toLowerCase().includes(itemSearch.toLowerCase()))
 .slice(0, 20)
 .map(s => (
 <button type="button" key={s.id} onClick={() => addItem("sparepart", s.id)}
 className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-hover text-xs transition-colors">
 <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
 <span className="flex-1 truncate">{s.name}</span>
 <span className="text-[10px] text-muted-foreground font-mono">{s.kode}</span>
 </button>
 ))
 )}
 </div>
 </div>
 </div>

 <button type="submit" disabled={saving || !formName || formItems.length === 0}
 className="w-full mt-2 py-2.5 bg-primary text-white font-medium rounded-xl disabled:opacity-50 flex justify-center items-center gap-2">
 {saving ? <Loader2 size={16} className="animate-spin" /> : editTarget ? "Simpan Perubahan" : "Buat Paket"}
 </button>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
