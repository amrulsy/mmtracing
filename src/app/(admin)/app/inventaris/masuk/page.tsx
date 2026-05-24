"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Package, Search, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface SparepartOption {
  id: number;
  kode: string;
  name: string;
  hargaBeli: number;
  stok: number;
  satuan?: string;
}

interface ItemMasuk {
  id: string; // temp id
  sparepartId: number | "";
  qty: number;
  hargaSatuan: number;
}

// Inline searchable combobox for sparepart selection
function SparepartPicker({ value, onChange, options }: {
  value: number | "";
  onChange: (id: number) => void;
  options: SparepartOption[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.id === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return options.slice(0, 50);
    const lower = q.toLowerCase();
    return options.filter(o =>
      o.name.toLowerCase().includes(lower) || o.kode.toLowerCase().includes(lower)
    ).slice(0, 50);
  }, [q, options]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-surface border border-surface-border rounded-lg px-2 py-1.5 text-sm text-left hover:bg-surface-hover focus:outline-none focus:ring-1 focus:ring-primary flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.name}</span>
              <span className="text-[10px] text-muted-foreground ml-1 font-mono">({selected.kode})</span>
            </>
          ) : (
            <span className="text-muted-foreground">-- Pilih Sparepart --</span>
          )}
        </span>
        <Search size={12} className="text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[280px] bg-surface border border-surface-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-surface-border">
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Cari nama / kode..."
              className="w-full bg-surface-hover rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">Tidak ada hasil</div>
            ) : filtered.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setOpen(false); setQ(""); }}
                className={`w-full px-3 py-2 text-left hover:bg-surface-hover flex items-center justify-between gap-2 border-b border-surface-border/40 ${o.id === value ? "bg-primary/5" : ""}`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{o.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{o.kode}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-muted-foreground">Stok: <span className="font-bold text-foreground">{o.stok}</span></div>
                  <div className="text-[10px] text-muted-foreground">Rp {Number(o.hargaBeli).toLocaleString("id-ID")}</div>
                </div>
              </button>
            ))}
            {!q && options.length > 50 && (
              <div className="p-2 text-[10px] text-muted-foreground text-center italic">Ketik untuk cari dari {options.length} sparepart...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StokMasukInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillId = searchParams.get("sparepartId");

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [spareparts, setSpareparts] = useState<SparepartOption[]>([]);

  const [noPo, setNoPo] = useState("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [tanggal, setTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [ongkosKirim, setOngkosKirim] = useState<number>(0);
  const [keterangan, setKeterangan] = useState<string>("");

  const [items, setItems] = useState<ItemMasuk[]>([
    { id: "1", sparepartId: "", qty: 1, hargaSatuan: 0 }
  ]);

  useEffect(() => {
    Promise.all([
      api.getPaginated<{ id: number; name: string }>("/supplier", { limit: 200 }),
      api.getPaginated<SparepartOption>("/sparepart", { limit: 2000 }),
    ]).then(([sup, sp]) => {
      setSuppliers(sup.data || []);
      setSpareparts(sp.data || []);
      // prefill
      if (prefillId) {
        const id = Number(prefillId);
        const found = (sp.data || []).find((x: any) => x.id === id);
        if (found) {
          setItems([{ id: "1", sparepartId: id, qty: 1, hargaSatuan: Number(found.hargaBeli) || 0 }]);
        }
      }
    }).catch((err: unknown) => toast.error("Gagal memuat data", err instanceof Error ? err.message : "Tidak dapat memuat daftar supplier dan sparepart"));
  }, [prefillId]);

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(36).slice(2), sparepartId: "", qty: 1, hargaSatuan: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemMasuk, value: any) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const updated = { ...i, [field]: value };
        if (field === "sparepartId") {
          const sp = spareparts.find(s => s.id === Number(value));
          if (sp) updated.hargaSatuan = Number(sp.hargaBeli) || 0;
        }
        return updated;
      }
      return i;
    }));
  };

  const subtotals = items.map(i => i.qty * i.hargaSatuan);
  const grandSub = subtotals.reduce((a, b) => a + b, 0);
  const grandTotal = grandSub + (ongkosKirim || 0);

  // Deteksi duplikasi
  const dupIds = useMemo(() => {
    const seen = new Map<number, number>();
    const dup = new Set<number>();
    items.forEach(it => {
      if (typeof it.sparepartId === "number" && it.sparepartId > 0) {
        const count = (seen.get(it.sparepartId) || 0) + 1;
        seen.set(it.sparepartId, count);
        if (count > 1) dup.add(it.sparepartId);
      }
    });
    return dup;
  }, [items]);

  const getSp = (id: number | "") => typeof id === "number" ? spareparts.find(s => s.id === id) : undefined;

  const handleSave = async () => {
    if (items.some(i => !i.sparepartId || i.qty <= 0)) {
      return toast.error("Error", "Semua baris harus memiliki sparepart dan QTY valid");
    }
    if (dupIds.size > 0) {
      return toast.error("Duplikasi", "Ada sparepart yang sama muncul > 1 kali. Gabungkan ke satu baris.");
    }

    setLoading(true);
    try {
      const tanggalIso = tanggal ? new Date(tanggal + "T12:00:00").toISOString() : undefined;
      await api.post("/inventaris/masuk/batch", {
        supplierId: supplierId ? Number(supplierId) : undefined,
        noPo: noPo || undefined,
        tanggal: tanggalIso,
        ongkosKirim: Number(ongkosKirim) || 0,
        keterangan: keterangan || undefined,
        items: items.map(i => ({
          sparepartId: Number(i.sparepartId),
          qty: Number(i.qty),
          hargaSatuan: Number(i.hargaSatuan),
        })),
      });
      toast.success("Berhasil", `${items.length} item stok masuk berhasil dicatat`);
      router.push("/app/inventaris");
    } catch (err: unknown) {
      toast.error("Gagal menyimpan", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-5xl mx-auto pb-24">
      <div className="flex items-center gap-4">
        <Link href="/app/inventaris" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catat Stok Masuk</h1>
          <p className="text-muted-foreground text-sm">Input pembelian sparepart dari supplier. HPP dihitung otomatis (Weighted Average Cost).</p>
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tanggal PO</label>
            <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">No. Dokumen / PO</label>
            <input type="text" value={noPo} onChange={e => setNoPo(e.target.value)} placeholder="Opsional" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Supplier <span className="text-amber-600">*</span></label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : "")} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">-- Pilih Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {!supplierId && <p className="text-[10px] text-amber-600">Disarankan diisi untuk audit & retur.</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ongkos Kirim (alokasi proporsional ke HPP)</label>
            <input type="number" min="0" value={ongkosKirim} onChange={e => setOngkosKirim(parseInt(e.target.value) || 0)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Keterangan (opsional)</label>
          <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Catatan PO..." className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Package size={16} /> Daftar Suku Cadang</h3>
          <button onClick={handleAddItem} className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-bold"><Plus size={14} /> Tambah Baris</button>
        </div>

        {dupIds.size > 0 && (
          <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
            <AlertTriangle size={14} /> Ada sparepart yang sama muncul lebih dari 1 kali. Gabungkan ke satu baris.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
              <tr>
                <th className="px-3 py-2 text-left font-semibold min-w-[220px]">Sparepart</th>
                <th className="px-3 py-2 text-center font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Harga/pcs</th>
                <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                <th className="px-3 py-2 text-center font-semibold">Stok Sebelum → Setelah</th>
                <th className="px-3 py-2 text-center font-semibold w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const sp = getSp(r.sparepartId);
                const stokBefore = sp?.stok ?? 0;
                const stokAfter = stokBefore + (r.qty || 0);
                const isDup = typeof r.sparepartId === "number" && dupIds.has(r.sparepartId);
                return (
                  <tr key={r.id} className={`border-b border-surface-border hover:bg-surface-hover/30 transition-colors ${isDup ? "bg-amber-500/5" : ""}`}>
                    <td className="px-3 py-2">
                      <SparepartPicker
                        value={r.sparepartId}
                        onChange={(id) => updateItem(r.id, "sparepartId", id)}
                        options={spareparts}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="1" value={r.qty} onChange={e => updateItem(r.id, "qty", parseInt(e.target.value) || 0)} className="w-20 mx-auto block bg-surface border border-surface-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" value={r.hargaSatuan} onChange={e => updateItem(r.id, "hargaSatuan", parseInt(e.target.value) || 0)} className="w-32 ml-auto block bg-surface border border-surface-border rounded-lg px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{fmt(r.qty * r.hargaSatuan)}</td>
                    <td className="px-3 py-2 text-center text-xs">
                      {sp ? (
                        <span className="font-mono"><span className="text-muted-foreground">{stokBefore}</span> → <span className="font-bold text-emerald-600">{stokAfter}</span></span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => handleRemoveItem(r.id)} disabled={items.length === 1} className="p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="mt-4 border-t border-surface-border pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Jumlah Baris</p>
            <p className="font-bold text-lg">{items.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Total Qty</p>
            <p className="font-bold text-lg">{items.reduce((a, b) => a + (b.qty || 0), 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Sub Total Barang</p>
            <p className="font-bold font-mono">{fmt(grandSub)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Grand Total (+ongkir)</p>
            <p className="font-bold text-lg font-mono text-primary">{fmt(grandTotal)}</p>
          </div>
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-surface/95 backdrop-blur border-t border-surface-border p-3 flex justify-end gap-3 z-10">
        <Link href="/app/inventaris" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Batal</Link>
        <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy disabled:opacity-70">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Simpan PO ({fmt(grandTotal)})</>}
        </button>
      </div>
    </div>
  );
}

export default function StokMasukPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Memuat...</div>}>
      <StokMasukInner />
    </Suspense>
  );
}
