"use client";

import { useState, useEffect } from "react";
import { Package, Plus, ChevronRight, Wrench, Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface BundleItem {
 type: 'jasa' | 'sparepart';
 id: number;
 qty: number;
}

interface ServiceBundle {
 id: string;
 name: string;
 description: string;
 icon: 'tuneup' | 'cvt' | 'rem' | 'oli' | 'mesin' | 'general';
 items: BundleItem[];
 estimasiWaktu?: string;
 garansi?: string;
}

// Fallback bundles if API fails
const FALLBACK_BUNDLES: ServiceBundle[] = [];

interface ServiceBundlePickerProps {
 onSelectBundle: (items: Array<{ type: 'jasa' | 'sparepart'; id: number; nama: string; harga: number; qty: number }>) => void;
}

const iconMap = {
 tuneup: <Wrench size={18} className="text-emerald-500" />,
 cvt: <Sparkles size={18} className="text-purple-500" />,
 rem: <div className="w-4 h-4 rounded-full border-2 border-red-500" />,
 oli: <div className="w-4 h-4 rounded-full bg-amber-400" />,
 mesin: <div className="w-4 h-4 rounded bg-blue-500" />,
 general: <Package size={18} className="text-primary" />,
};

export function ServiceBundlePicker({ onSelectBundle }: ServiceBundlePickerProps) {
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [loading, setLoading] = useState<string | null>(null);
 const [bundles, setBundles] = useState<ServiceBundle[]>(FALLBACK_BUNDLES);
 const [loadingBundles, setLoadingBundles] = useState(true);

 // Fetch bundles from API on mount
 useEffect(() => {
 const fetchBundles = async () => {
 try {
 setLoadingBundles(true);
 const res = await api.get<ServiceBundle[]>('/service-bundles', { active: 'true' });
 if (Array.isArray(res.data)) {
 setBundles(res.data);
 } else {
 setBundles(FALLBACK_BUNDLES);
 }
 } catch {
 // Silent fail - will show empty state
 setBundles(FALLBACK_BUNDLES);
 } finally {
 setLoadingBundles(false);
 }
 };

 fetchBundles();
 }, []);

 const handleApplyBundle = async (bundle: ServiceBundle) => {
 setLoading(bundle.id);
 try {
 // Fetch individual jasa and sparepart details by ID
 const jasaItems = bundle.items.filter(i => i.type === 'jasa');
 const sparepartItems = bundle.items.filter(i => i.type === 'sparepart');

 interface JasaItem { id: number; name: string; harga: number }
 interface SparepartItem { id: number; name: string; hargaJual: number }

 const [jasaResults, sparepartResults] = await Promise.all([
 Promise.allSettled(jasaItems.map(i =>
 api.get<JasaItem>(`/jasa/${i.id}`)
 )),
 Promise.allSettled(sparepartItems.map(i =>
 api.get<SparepartItem>(`/sparepart/${i.id}`)
 )),
 ]);

 const jasaMap = new Map<number, JasaItem>();
 jasaResults.forEach((r, idx) => {
 if (r.status === 'fulfilled' && r.value.data) {
 jasaMap.set(jasaItems[idx].id, r.value.data);
 }
 });

 const sparepartMap = new Map<number, SparepartItem>();
 sparepartResults.forEach((r, idx) => {
 if (r.status === 'fulfilled' && r.value.data) {
 sparepartMap.set(sparepartItems[idx].id, r.value.data);
 }
 });

 const resolvedItems = bundle.items.map(item => {
 if (item.type === 'jasa') {
 const jasa = jasaMap.get(item.id);
 return {
 type: 'jasa' as const,
 id: item.id,
 nama: jasa?.name ?? `Jasa #${item.id}`,
 harga: Number(jasa?.harga ?? 0),
 qty: item.qty,
 };
 } else {
 const sp = sparepartMap.get(item.id);
 return {
 type: 'sparepart' as const,
 id: item.id,
 nama: sp?.name ?? `Sparepart #${item.id}`,
 harga: Number(sp?.hargaJual ?? 0),
 qty: item.qty,
 };
 }
 }).filter(item => item.harga > 0 || !item.nama.includes('#'));

 onSelectBundle(resolvedItems);
 toast.success(`Paket "${bundle.name}" diterapkan`, `${resolvedItems.length} item ditambahkan`);
 setExpandedId(null);
 } catch {
 toast.error("Gagal memuat paket", "Coba lagi nanti");
 } finally {
 setLoading(null);
 }
 };

 return (
 <div className="space-y-3">
 <div className="flex items-center gap-2">
 <Package size={16} className="text-primary" />
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paket Servis Cepat</span>
 </div>

 {loadingBundles ? (
 <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
 <Loader2 size={16} className="animate-spin" />
 <span>Memuat paket servis...</span>
 </div>
 ) : bundles.length === 0 ? (
 <div className="text-center py-6 text-muted-foreground">
 <Package size={32} className="mx-auto mb-2 opacity-30" />
 <p className="text-sm">Belum ada paket servis tersedia</p>
 <p className="text-xs mt-1">Hubungi admin untuk menambahkan paket</p>
 </div>
 ) : (
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
 {bundles.map((bundle) => {
 const isExpanded = expandedId === bundle.id;
 const isLoading = loading === bundle.id;

 return (
 <div
 key={bundle.id}
 className={`group relative border rounded-xl overflow-hidden transition-all ${
 isExpanded 
 ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' 
 : 'border-surface-border hover:border-primary/30 hover:bg-surface-hover/30'
 }`}
 >
 {/* Main Card */}
 <button
 type="button"
 onClick={() => setExpandedId(isExpanded ? null : bundle.id)}
 className="w-full p-3 text-left"
 >
 <div className="flex items-start gap-3">
 <div className="w-9 h-9 rounded-lg bg-surface border border-surface-border flex items-center justify-center shrink-0">
 {iconMap[bundle.icon]}
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-sm truncate">{bundle.name}</h4>
 <p className="text-[10px] text-muted-foreground line-clamp-1">{bundle.description}</p>
 {bundle.estimasiWaktu && (
 <p className="text-[10px] text-amber-600 mt-0.5">⏱️ {bundle.estimasiWaktu}</p>
 )}
 </div>
 <ChevronRight 
 size={16} 
 className={`text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
 />
 </div>
 </button>

 {/* Expanded Details */}
 {isExpanded && (
 <div className="px-3 pb-3 border-t border-surface-border/50 pt-2">
 <div className="space-y-2">
 <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
 Isi Paket ({bundle.items.length} item)
 </p>
 <div className="space-y-1">
 {bundle.items.map((item, idx) => (
 <div 
 key={idx} 
 className="flex items-center gap-2 text-xs py-1 px-2 bg-surface-hover/50 rounded-lg"
 >
 <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'jasa' ? 'bg-primary' : 'bg-blue-500'}`} />
 <span className="flex-1 truncate">
 {item.type === 'jasa' ? 'Jasa' : 'Sparepart'} #{item.id}
 </span>
 <span className="text-muted-foreground">×{item.qty}</span>
 </div>
 ))}
 </div>

 {bundle.garansi && (
 <p className="text-[10px] text-green-600 flex items-center gap-1">
 ✓ Garansi {bundle.garansi}
 </p>
 )}

 <button
 type="button"
 onClick={() => handleApplyBundle(bundle)}
 disabled={isLoading}
 className="w-full mt-2 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
 >
 {isLoading ? (
 <span className="animate-pulse">Memuat...</span>
 ) : (
 <>
 <Plus size={14} />
 Terapkan Paket
 </>
 )}
 </button>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}

export type { ServiceBundle, BundleItem };
