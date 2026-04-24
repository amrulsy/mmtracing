"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

export default function TambahSparepartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [kategoriList, setKategoriList] = useState<{id: number, name: string}[]>([]);

  const [kode, setKode] = useState("");
  const [name, setName] = useState("");
  const [merk, setMerk] = useState("");
  const [kategoriId, setKategoriId] = useState<number | "">("");
  const [satuan, setSatuan] = useState("pcs");
  const [hargaBeli, setHargaBeli] = useState(0);
  const [hargaJual, setHargaJual] = useState(0);
  const [stok, setStok] = useState(0);
  const [stokMinimum, setStokMinimum] = useState(5);
  const [lokasi, setLokasi] = useState("");

  useEffect(() => {
    api.get<{id: number, name: string}[]>("/sparepart/categories")
      .then(res => setKategoriList(res.data || []))
      .catch(() => {});
  }, []);

  const margin = hargaBeli > 0 ? Math.round(((hargaJual - hargaBeli) / hargaBeli) * 100) : 0;

  const handleSave = async () => {
    if (!kode.trim() || !name.trim()) {
      return toast.error("Validasi", "Kode dan Nama Sparepart wajib diisi");
    }
    setLoading(true);
    try {
      await api.post("/sparepart", {
        kode: kode.trim(),
        name: name.trim(),
        merk: merk.trim() || undefined,
        kategoriId: kategoriId || undefined,
        satuan,
        hargaBeli,
        hargaJual,
        stok,
        stokMinimum,
        lokasi: lokasi.trim() || undefined,
      });
      toast.success("Berhasil", `Sparepart "${name}" berhasil ditambahkan`);
      router.push("/app/master/sparepart");
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Gagal menyimpan sparepart");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/app/master/sparepart" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tambah Sparepart Baru</h1>
          <p className="text-muted-foreground text-sm">Lengkapi data sparepart untuk katalog bengkel.</p>
        </div>
      </div>

      <div className="glass-panel p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kode Sparepart *</label>
            <input type="text" value={kode} onChange={e => setKode(e.target.value)} placeholder="Contoh: SP-001" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Lokasi Rak</label>
            <input type="text" value={lokasi} onChange={e => setLokasi(e.target.value)} placeholder="Contoh: Rak A-3" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nama Sparepart *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Oli Mesin Yamalube 10W-40 800ml" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
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
            <label className="text-xs font-medium text-muted-foreground">Harga Beli (Rp) *</label>
            <input type="number" min="0" value={hargaBeli} onChange={e => setHargaBeli(Number(e.target.value))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Harga Jual (Rp) *</label>
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
            <label className="text-xs font-medium text-muted-foreground">Stok Awal</label>
            <input type="number" min="0" value={stok} onChange={e => setStok(Number(e.target.value))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Stok Minimum (Alert)</label>
            <input type="number" min="0" value={stokMinimum} onChange={e => setStokMinimum(Number(e.target.value))} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/app/master/sparepart" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Batal</Link>
        <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy disabled:opacity-70">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Simpan Sparepart</>}
        </button>
      </div>
    </div>
  );
}
