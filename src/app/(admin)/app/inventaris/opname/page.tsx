"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, AlertTriangle, Loader2, Search, Printer, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface OpnameItem {
  sparepartId: number;
  kode: string;
  name: string;
  kategori?: string | null;
  hargaBeli: number;
  stokSistem: number;
  stokFisik: number;
  selisih: number;
  keterangan: string;
}

const DRAFT_KEY = "opname:draft:v1";
const PAGE_SIZE = 50;

export default function StokOpnamePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<OpnameItem[]>([]);
  const [catatan, setCatatan] = useState("");
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState("");
  const [onlySelisih, setOnlySelisih] = useState(false);
  const [page, setPage] = useState(1);
  const [restored, setRestored] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Load data + optional restore draft
  useEffect(() => {
    api.get<any[]>("/sparepart?limit=5000")
      .then(res => {
        const parts = res.data || [];
        const initItems: OpnameItem[] = parts.map((p: any) => ({
          sparepartId: p.id,
          kode: p.kode,
          name: p.name,
          kategori: p.kategori?.name || null,
          hargaBeli: Number(p.hargaBeli) || 0,
          stokSistem: Number(p.stok),
          stokFisik: Number(p.stok),
          selisih: 0,
          keterangan: ""
        }));

        // Draft restore
        try {
          const raw = typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_KEY) : null;
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft && Array.isArray(draft.items) && draft.items.length > 0) {
              // Merge by sparepartId (use fresh stokSistem from server, override stokFisik/keterangan from draft)
              const dmap = new Map<number, any>(draft.items.map((d: any) => [d.sparepartId, d]));
              const merged = initItems.map(i => {
                const d = dmap.get(i.sparepartId);
                if (d) {
                  const stokFisik = Number(d.stokFisik) || 0;
                  return { ...i, stokFisik, selisih: stokFisik - i.stokSistem, keterangan: d.keterangan || "" };
                }
                return i;
              });
              setItems(merged);
              setCatatan(draft.catatan || "");
              setRestored(true);
              return;
            }
          }
        } catch {/* ignore */ }

        setItems(initItems);
      })
      .catch((err: unknown) => toast.error("Gagal memuat barang", err instanceof Error ? err.message : "Terjadi kesalahan"))
      .finally(() => setLoading(false));
  }, []);

  // Autosave draft
  useEffect(() => {
    if (loading || items.length === 0) return;
    const hasChanges = items.some(i => i.selisih !== 0 || i.keterangan) || catatan;
    if (!hasChanges) return;
    const t = setTimeout(() => {
      try {
        const payload = {
          updatedAt: new Date().toISOString(),
          catatan,
          items: items
            .filter(i => i.selisih !== 0 || i.keterangan)
            .map(i => ({ sparepartId: i.sparepartId, stokFisik: i.stokFisik, keterangan: i.keterangan })),
        };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch {/* ignore */ }
    }, 500);
    return () => clearTimeout(t);
  }, [items, catatan, loading]);

  const handleUpdateFisik = useCallback((id: number, val: string) => {
    const num = parseInt(val);
    const validNum = isNaN(num) ? 0 : num;
    setItems(curr => curr.map(i =>
      i.sparepartId === id ? { ...i, stokFisik: validNum, selisih: validNum - i.stokSistem } : i
    ));
  }, []);

  const handleUpdateKet = useCallback((id: number, ket: string) => {
    setItems(curr => curr.map(i => i.sparepartId === id ? { ...i, keterangan: ket } : i));
  }, []);

  const handleDiscardDraft = () => {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch {/* ignore */ }
    setItems(curr => curr.map(i => ({ ...i, stokFisik: i.stokSistem, selisih: 0, keterangan: "" })));
    setCatatan("");
    setRestored(false);
    toast.success("Draft dibuang", "Data reset ke stok sistem");
  };

  // Filtering
  const kategoriList = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.kategori) s.add(i.kategori); });
    return Array.from(s).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const lower = q.trim().toLowerCase();
    return items.filter(i => {
      if (onlySelisih && i.selisih === 0) return false;
      if (kategori && i.kategori !== kategori) return false;
      if (lower && !i.name.toLowerCase().includes(lower) && !i.kode.toLowerCase().includes(lower)) return false;
      return true;
    });
  }, [items, q, kategori, onlySelisih]);

  useEffect(() => { setPage(1); }, [q, kategori, onlySelisih]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paged = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const totalDiperiksa = items.length;
  const itemSelisih = items.filter(i => i.selisih !== 0).length;
  const akurasi = totalDiperiksa > 0 ? Math.round(((totalDiperiksa - itemSelisih) / totalDiperiksa) * 100) : 0;
  const nilaiSelisih = items.reduce((acc, i) => acc + Math.abs(i.selisih) * i.hargaBeli, 0);
  const hasLargeVariance = items.some(i => i.stokSistem > 0 && Math.abs(i.selisih) / i.stokSistem > 0.5) || (itemSelisih / Math.max(1, totalDiperiksa)) > 0.2;

  const submitOpname = async () => {
    setSaving(true);
    try {
      await api.post("/inventaris/opname", {
        catatan,
        items: items.map(i => ({
          sparepartId: i.sparepartId,
          stokSistem: i.stokSistem,
          stokFisik: i.stokFisik,
          keterangan: i.keterangan || undefined
        }))
      });
      try { window.localStorage.removeItem(DRAFT_KEY); } catch {/* ignore */ }
      toast.success("Berhasil", "Opname tercatat. Master stok telah disinkronkan.");
      router.push("/app/inventaris");
    } catch (err: unknown) {
      toast.error("Gagal opname", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const handleSave = () => {
    if (items.length === 0) return;
    if (itemSelisih === 0) {
      toast.confirm("Tidak ada selisih yang ditemukan. Tetap catat Opname ini?", submitOpname);
      return;
    }
    if (hasLargeVariance) {
      setConfirmOpen(true);
      return;
    }
    submitOpname();
  };

  const handlePrint = () => {
    window.print();
  };

  const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Memuat database master...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-6xl mx-auto mb-10 print:mb-0">
      <div className="flex items-center gap-4 print:hidden">
        <Link href="/app/inventaris" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Stok Opname Gudang</h1>
          <p className="text-muted-foreground text-sm">Validasi fisik stok dengan sistem untuk memastikan akurasi inventaris.</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover">
          <Printer size={16} /> Cetak Lembar
        </button>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Lembar Stok Opname</h1>
        <p className="text-sm">Tanggal: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="text-sm">Petugas: ____________________________</p>
      </div>

      {restored && (
        <div className="glass-panel p-3 border border-amber-500/30 bg-amber-500/5 flex items-center gap-2 text-xs print:hidden">
          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
          <span className="flex-1">Draft opname ditemukan dan dipulihkan. Lanjutkan atau buang draft untuk mulai dari awal.</span>
          <button onClick={handleDiscardDraft} className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30">Buang Draft</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Total SKU</p>
          <p className="text-xl font-bold">{totalDiperiksa}</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Selisih</p>
          <p className={`text-xl font-bold ${itemSelisih > 0 ? "text-amber-500" : "text-muted-foreground"}`}>{itemSelisih} item</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Akurasi</p>
          <p className={`text-xl font-bold ${akurasi === 100 ? "text-emerald-500" : "text-amber-500"}`}>{akurasi}%</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Nilai Selisih (HPP)</p>
          <p className={`text-base font-bold font-mono ${nilaiSelisih > 0 ? "text-red-500" : "text-muted-foreground"}`}>{fmt(nilaiSelisih)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-3 print:hidden">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / kode sparepart..." className="w-full pl-8 pr-3 py-2 bg-surface border border-surface-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={kategori} onChange={e => setKategori(e.target.value)} className="bg-surface border border-surface-border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Semua Kategori</option>
            {kategoriList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-surface border border-surface-border cursor-pointer hover:bg-surface-hover">
            <input type="checkbox" checked={onlySelisih} onChange={e => setOnlySelisih(e.target.checked)} />
            Hanya yang ada selisih
          </label>
          <span className="text-[10px] text-muted-foreground ml-auto"><Filter size={10} className="inline mr-1" />{filteredItems.length} ditampilkan dari {totalDiperiksa}</span>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-surface-border bg-surface-hover/30 flex justify-between items-center gap-3 print:hidden">
          <p className="text-sm font-medium text-muted-foreground">Pelaksanaan Opname: <span className="font-bold text-foreground">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold">Mode Validasi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Kode</th>
                <th className="px-3 py-2 text-left font-semibold">Nama Sparepart</th>
                <th className="px-3 py-2 text-center font-semibold">Sistem</th>
                <th className="px-3 py-2 text-center font-semibold">Fisik</th>
                <th className="px-3 py-2 text-center font-semibold">Selisih</th>
                <th className="px-3 py-2 text-right font-semibold print:hidden">Nilai</th>
                <th className="px-3 py-2 text-left font-semibold print:hidden">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => {
                const nilai = Math.abs(item.selisih) * item.hargaBeli;
                return (
                  <tr key={item.sparepartId} className={`border-b border-surface-border transition-colors ${item.selisih !== 0 ? "bg-amber-500/5 hover:bg-amber-500/10" : "bg-surface hover:bg-surface-hover/30"}`}>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{item.kode}</td>
                    <td className="px-3 py-2 font-medium">{item.name}{item.kategori && <span className="ml-2 text-[9px] text-muted-foreground">[{item.kategori}]</span>}</td>
                    <td className="px-3 py-2 text-center font-mono text-muted-foreground">
                      <span className="px-2 py-1 bg-surface-hover rounded-md print:bg-transparent">{item.stokSistem}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.stokFisik}
                        onChange={e => handleUpdateFisik(item.sparepartId, e.target.value)}
                        className="w-20 mx-auto block bg-surface border border-surface-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 shadow-sm rounded-lg px-2 py-1.5 text-sm text-center font-mono focus:outline-none transition-all print:border-b print:border-0 print:rounded-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.selisih !== 0 ? (
                        <span className={`font-bold font-mono px-2 py-0.5 rounded-md text-xs ${item.selisih > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
                          {item.selisih > 0 ? "+" : ""}{item.selisih}
                        </span>
                      ) : (
                        <CheckCircle size={14} className="text-emerald-500 inline" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs print:hidden">
                      {item.selisih !== 0 ? (
                        <span className={item.selisih < 0 ? "text-red-500" : "text-emerald-600"}>{fmt(nilai)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 print:hidden">
                      <input
                        type="text"
                        value={item.keterangan}
                        onChange={e => handleUpdateKet(item.sparepartId, e.target.value)}
                        placeholder="Alasan selisih..."
                        className="w-full bg-surface border border-surface-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Tidak ada data sesuai filter</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-surface-border text-xs print:hidden">
            <span className="text-muted-foreground">Halaman {page} dari {totalPages} · {filteredItems.length} item</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded-lg border border-surface-border disabled:opacity-40">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded-lg border border-surface-border disabled:opacity-40">‹</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 rounded-lg border border-surface-border disabled:opacity-40">›</button>
              <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="px-2 py-1 rounded-lg border border-surface-border disabled:opacity-40">»</button>
            </div>
          </div>
        )}

        <div className="p-4 bg-surface-hover/20 print:hidden">
          <label className="text-xs font-medium text-muted-foreground block mb-2">Catatan Opname (Opsional)</label>
          <textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            placeholder="Contoh: Rak B1 ada barang rusak kena rembesan..."
            className="w-full bg-surface border border-surface-border focus:ring-2 focus:ring-primary/40 rounded-xl p-3 text-sm min-h-[80px]"
          ></textarea>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 print:hidden">
        <Link href="/app/inventaris" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Batal</Link>
        <button onClick={handleSave} disabled={saving || items.length === 0} className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:opacity-90 transition-all flex items-center gap-2 btn-glossy disabled:opacity-70">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Simpan Opname & Sinkronkan Stok</>}
        </button>
      </div>

      {/* Confirm modal for large variance */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden" onClick={() => !saving && setConfirmOpen(false)}>
          <div className="glass-panel max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-bold">Selisih Signifikan</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Terdeteksi selisih yang tidak biasa:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li><span className="font-bold text-foreground">{itemSelisih}</span> dari {totalDiperiksa} SKU ({Math.round(itemSelisih / Math.max(1, totalDiperiksa) * 100)}%) berubah</li>
                <li>Nilai selisih total: <span className="font-bold text-foreground">{fmt(nilaiSelisih)}</span></li>
              </ul>
              <p className="pt-2">Pastikan hitungan fisik sudah benar. Setelah disimpan, master stok akan diperbarui dan tidak bisa di-undo.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} disabled={saving} className="px-4 py-2 text-sm border border-surface-border rounded-lg hover:bg-surface-hover">Periksa Ulang</button>
              <button onClick={submitOpname} disabled={saving} className="px-4 py-2 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-70 flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Ya, Saya Yakin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
