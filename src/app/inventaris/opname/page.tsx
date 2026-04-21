"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface OpnameItem {
  sparepartId: number;
  name: string;
  stokSistem: number;
  stokFisik: number;
  selisih: number;
  keterangan: string;
}

export default function StokOpnamePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [items, setItems] = useState<OpnameItem[]>([]);
  const [originalItems, setOriginalItems] = useState<OpnameItem[]>([]);
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    // Fetch all spareparts to see current system stock
    api.get<any[]>("/sparepart?limit=1000")
      .then(res => {
        const parts = res.data || [];
        const initItems = parts.map((p: any) => ({
          sparepartId: p.id,
          name: p.name,
          stokSistem: Number(p.stok),
          stokFisik: Number(p.stok), // default to same
          selisih: 0,
          keterangan: ""
        }));
        setItems(initItems);
        setOriginalItems(initItems);
      })
      .catch(err => toast.error("Gagal memuat barang", err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateFisik = (id: number, val: string) => {
    const num = parseInt(val);
    const validNum = isNaN(num) ? 0 : num;
    
    setItems(items.map(i => {
      if (i.sparepartId === id) {
        return {
          ...i,
          stokFisik: validNum,
          selisih: validNum - i.stokSistem
        };
      }
      return i;
    }));
  };

  const handleUpdateKet = (id: number, ket: string) => {
    setItems(items.map(i => i.sparepartId === id ? { ...i, keterangan: ket } : i));
  };

  const handleSave = async () => {
    const changedItems = items.filter(i => i.selisih !== 0);

    const doSave = async () => {
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
        toast.success("Berhasil", "Data Stok Opname resmi disimpan. Master stok diperbarui.");
        router.push("/inventaris");
      } catch (err: unknown) {
        toast.error("Gagal opname", err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setSaving(false);
      }
    };

    if (changedItems.length === 0) {
      toast.confirm("Tidak ada selisih yang ditemukan. Tetap catat Opname ini?", doSave);
    } else {
      doSave();
    }
  };

  const totalDiperiksa = items.length;
  const itemSelisih = items.filter(i => i.selisih !== 0).length;
  const akurasi = totalDiperiksa > 0 ? Math.round(((totalDiperiksa - itemSelisih) / totalDiperiksa) * 100) : 0;

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2"/> Memuat database master...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto mb-10">
      <div className="flex items-center gap-4">
        <Link href="/inventaris" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stok Opname Gudang</h1>
          <p className="text-muted-foreground text-sm">Validasi fisik stok dengan sistem untuk akurasi data inventaris.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Baris SKUs", value: `${totalDiperiksa} item`, icon: CheckCircle, color: "" },
          { label: "Selisih Ditemukan", value: `${itemSelisih} item`, icon: AlertTriangle, color: itemSelisih > 0 ? "text-amber-500" : "text-muted-foreground" },
          { label: "Akurasi Sistem", value: `${akurasi}%`, icon: CheckCircle, color: akurasi === 100 ? "text-emerald-500" : "text-amber-500" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-4 text-center border-t-4 border-t-primary/20">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-surface-border bg-surface-hover/30 flex justify-between items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">Pelaksanaan Opname: <span className="font-bold text-foreground">{new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span></p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold">Mode Validasi</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Nama Suku Cadang</th>
                <th className="px-4 py-3 text-center font-semibold">Stok Sistem</th>
                <th className="px-4 py-3 text-center font-semibold">Stok Aktual (Fisik)</th>
                <th className="px-4 py-3 text-center font-semibold">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.sparepartId} className={`border-b border-surface-border transition-colors ${item.selisih !== 0 ? "bg-amber-500/5 hover:bg-amber-500/10" : "bg-surface hover:bg-surface-hover/30"}`}>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                    <span className="px-2 py-1 bg-surface-hover rounded-md">{item.stokSistem}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="number" 
                      min="0"
                      value={item.stokFisik}
                      onChange={e => handleUpdateFisik(item.sparepartId, e.target.value)}
                      className="w-20 mx-auto block bg-surface border border-surface-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 shadow-sm rounded-lg px-2 py-1.5 text-sm text-center font-mono focus:outline-none transition-all" 
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {item.selisih !== 0 ? (
                        <span className={`font-bold font-mono px-2 py-0.5 rounded-md text-xs ${item.selisih > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
                          {item.selisih > 0 ? "+" : ""}{item.selisih}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono"><CheckCircle size={14} className="text-emerald-500" /></span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">Tidak temukan data master sparepart</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-surface-hover/20">
            <label className="text-xs font-medium text-muted-foreground block mb-2">Catatan Bersama Opname (Opsional)</label>
            <textarea 
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Contoh: Baris rak B dikembalikan karena rusak terkena rembesan atap..."
              className="w-full bg-surface border border-surface-border focus:ring-2 focus:ring-primary/40 rounded-xl p-3 text-sm min-h-[80px]"
            ></textarea>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Link href="/inventaris" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Batal</Link>
        <button onClick={handleSave} disabled={saving || items.length === 0} className="px-6 py-2.5 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-glossy transition-all flex items-center gap-2 btn-glossy disabled:opacity-70 disabled:hover:bg-amber-600">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Simpan & Tembak Sistem!</>}
        </button>
      </div>
    </div>
  );
}
