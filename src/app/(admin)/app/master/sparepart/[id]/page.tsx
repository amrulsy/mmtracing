"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Package } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Sparepart, InventarisLog } from "@/lib/types";

interface SparepartDetail extends Sparepart {
  inventarisLog?: InventarisLog[];
  kategori?: { id: number; name: string } | null;
}

export default function EditSparepartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kategoriList, setKategoriList] = useState<{id: number, name: string}[]>([]);

  const [kode, setKode] = useState("");
  const [name, setName] = useState("");
  const [merk, setMerk] = useState("");
  const [kategoriId, setKategoriId] = useState<number | "">("");
  const [satuan, setSatuan] = useState("pcs");
  const [hargaBeli, setHargaBeli] = useState(0);
  const [hargaJual, setHargaJual] = useState(0);
  const [stokMinimum, setStokMinimum] = useState(5);
  const [lokasi, setLokasi] = useState("");
  const [stok, setStok] = useState(0);
  const [logs, setLogs] = useState<InventarisLog[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<SparepartDetail>(`/sparepart/${id}`),
      api.get<{id: number, name: string}[]>("/sparepart/categories"),
    ]).then(([spRes, katRes]) => {
      const sp = spRes.data;
      setKode(sp.kode || "");
      setName(sp.name || "");
      setMerk(sp.merk || "");
      setKategoriId(sp.kategori?.id ?? "");
      setSatuan(sp.satuan || "pcs");
      setHargaBeli(Number(sp.hargaBeli));
      setHargaJual(Number(sp.hargaJual));
      setStokMinimum(sp.stokMinimum ?? 5);
      setLokasi(sp.lokasi || "");
      setStok(sp.stok ?? 0);
      setLogs(sp.inventarisLog || []);
      setKategoriList(katRes.data || []);
    }).catch(err => {
      toast.error("Gagal", err instanceof Error ? err.message : "Gagal memuat data sparepart");
    }).finally(() => setPageLoading(false));
  }, [id]);

  const margin = hargaBeli > 0 ? Math.round(((hargaJual - hargaBeli) / hargaBeli) * 100) : 0;

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Validasi", "Nama Sparepart wajib diisi");
    setSaving(true);
    try {
      await api.put(`/sparepart/${id}`, {
        kode: kode.trim() || undefined,
        name: name.trim(),
        merk: merk.trim() || undefined,
        kategoriId: kategoriId || undefined,
        satuan,
        hargaBeli,
        hargaJual,
        stokMinimum,
        lokasi: lokasi.trim() || undefined,
      });
      toast.success("Berhasil", `Sparepart "${name}" berhasil diperbarui`);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  if (pageLoading) {
    return <div className="p-10 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Memuat data...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/app/master/sparepart" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{name || "Edit Sparepart"}</h1>
          <p className="text-muted-foreground text-sm font-mono">{kode} • Stok: <span className={stok === 0 ? "text-red-500 font-bold" : stok <= stokMinimum ? "text-amber-500 font-bold" : "text-emerald-600 font-bold"}>{stok}</span></p>
        </div>
      </div>

      <div className="glass-panel p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kode Sparepart</label>
            <input type="text" value={kode} onChange={e => setKode(e.target.value)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Lokasi Rak</label>
            <input type="text" value={lokasi} onChange={e => setLokasi(e.target.value)} placeholder="Contoh: Rak A-3" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nama Sparepart *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Merk</label>
            <input type="text" value={merk} onChange={e => setMerk(e.target.value)} placeholder="Yamaha, NGK, dll" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kategori</label>
            <select value={kategoriId} onChange={e => setKategoriId(e.target.value ? Number(e.target.value) : "")} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">-- Pilih Kategori --</option>
              {kategoriList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Satuan</label>
            <select value={satuan} onChange={e => setSatuan(e.target.value)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="pcs">pcs</option>
              <option value="liter">liter</option>
              <option value="set">set</option>
              <option value="pasang">pasang</option>
              <option value="meter">meter</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Harga Beli (Rp)</label>
            <input type="number" min="0" value={hargaBeli} onChange={e => setHargaBeli(Number(e.target.value))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Harga Jual (Rp)</label>
            <input type="number" min="0" value={hargaJual} onChange={e => setHargaJual(Number(e.target.value))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Margin</label>
            <div className={`w-full bg-surface-hover border border-surface-border rounded-xl px-3 py-2.5 text-sm text-right font-mono font-bold ${margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {hargaBeli > 0 ? `${margin}%` : "— %"}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Stok Saat Ini</label>
            <div className="w-full bg-surface-hover border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center font-mono font-bold text-muted-foreground">
              {stok} {satuan} <span className="text-xs font-normal">(ubah via Stok Masuk / Opname)</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Stok Minimum (Alert)</label>
            <input type="number" min="0" value={stokMinimum} onChange={e => setStokMinimum(Number(e.target.value))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2"><Package size={14} /> Riwayat Inventaris (20 Terakhir)</h3>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-border hover:bg-surface-hover/30 text-sm transition-colors">
                <div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${log.type === "masuk" ? "bg-emerald-500/10 text-emerald-600" : log.type === "keluar" ? "bg-red-500/10 text-red-500" : log.type === "opname" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {log.type}
                  </span>
                  <span className="text-muted-foreground text-xs">{formatDate(log.createdAt)}</span>
                  {log.keterangan && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{log.keterangan}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold font-mono ${log.type === "masuk" ? "text-emerald-600" : "text-red-500"}`}>
                    {log.type === "masuk" ? "+" : "-"}{log.qty} {satuan}
                  </p>
                  {Number(log.totalHarga) > 0 && <p className="text-xs text-muted-foreground font-mono">{formatRp(Number(log.totalHarga))}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Link href="/app/master/sparepart" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Kembali</Link>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy disabled:opacity-70">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Simpan Perubahan</>}
        </button>
      </div>
    </div>
  );
}
