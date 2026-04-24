"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Package } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface ItemMasuk {
  id: string; // temp id for UI
  sparepartId: number | "";
  qty: number;
  hargaSatuan: number;
}

export default function StokMasukPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{id: number, name: string}[]>([]);
  const [spareparts, setSpareparts] = useState<{id: number, name: string, hargaBeli: number}[]>([]);
  
  const [noPo, setNoPo] = useState("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  
  const [items, setItems] = useState<ItemMasuk[]>([
    { id: "1", sparepartId: "", qty: 1, hargaSatuan: 0 }
  ]);

  useEffect(() => {
    // Fetch data using the proper API helper
    Promise.all([
      api.getPaginated<{id: number, name: string}>("/supplier", { limit: "100" }),
      api.getPaginated<{id: number, name: string, hargaBeli: number}>("/sparepart", { limit: "1000" }),
    ]).then(([sup, sp]) => {
      setSuppliers(sup.data || []);
      setSpareparts(sp.data || []);
    }).catch((err: unknown) => toast.error("Gagal memuat data", err instanceof Error ? err.message : "Tidak dapat memuat daftar supplier dan sparepart"));
  }, []);

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(), sparepartId: "", qty: 1, hargaSatuan: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemMasuk, value: any) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const updated = { ...i, [field]: value };
        // Auto fill harga beli when sparepart selected
        if (field === "sparepartId") {
          const sp = spareparts.find(s => s.id === Number(value));
          if (sp) updated.hargaSatuan = Number(sp.hargaBeli);
        }
        return updated;
      }
      return i;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((acc, curr) => acc + (curr.qty * curr.hargaSatuan), 0);
  };

  const handleSave = async () => {
    if (items.some(i => !i.sparepartId || i.qty <= 0)) {
      return toast.error("Error", "Semua baris harus memiliki sparepart dan QTY valid");
    }

    setLoading(true);
    try {
      const promises = items.map(item =>
        api.post("/inventaris/masuk", {
          sparepartId: Number(item.sparepartId),
          supplierId: supplierId ? Number(supplierId) : undefined,
          qty: Number(item.qty),
          hargaSatuan: Number(item.hargaSatuan),
          noPo: noPo || undefined,
        })
      );

      await Promise.all(promises);
      toast.success("Berhasil", "Stok masuk berhasil dicatat");
      router.push("/app/inventaris");
    } catch (err: unknown) {
      toast.error("Gagal menyimpan", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/app/inventaris" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catat Stok Masuk</h1>
          <p className="text-muted-foreground text-sm">Input pembelian sparepart dari supplier ke gudang.</p>
        </div>
      </div>

      <div className="glass-panel p-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">No. Dokumen / PO</label>
            <input type="text" value={noPo} onChange={e => setNoPo(e.target.value)} placeholder="Opsional" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Supplier</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : "")} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">-- Pilih Supplier (Opsional) --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tanggal Masuk</label>
            <div className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-muted-foreground">
              {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Package size={16} /> Daftar Suku Cadang</h3>
          <button onClick={handleAddItem} className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-bold"><Plus size={14} /> Tambah Baris</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Sparepart</th>
                <th className="px-3 py-2 text-center font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Harga Modal/pcs</th>
                <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                <th className="px-3 py-2 text-center font-semibold w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={r.id} className="border-b border-surface-border hover:bg-surface-hover/30 transition-colors">
                  <td className="px-3 py-2">
                    <select value={r.sparepartId} onChange={e => updateItem(r.id, "sparepartId", e.target.value)} className="w-full bg-surface border border-surface-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">-- Pilih Sparepart --</option>
                      {spareparts.map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input type="number" min="1" value={r.qty} onChange={e => updateItem(r.id, "qty", parseInt(e.target.value) || 0)} className="w-20 mx-auto block bg-surface border border-surface-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" value={r.hargaSatuan} onChange={e => updateItem(r.id, "hargaSatuan", parseInt(e.target.value) || 0)} className="w-32 ml-auto block bg-surface border border-surface-border rounded-lg px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-primary" /></td>
                  <td className="px-3 py-2 text-right font-mono font-medium">Rp {(r.qty * r.hargaSatuan).toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => handleRemoveItem(r.id)} disabled={items.length === 1} className="p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-surface-border bg-surface-hover/20">
                <td colSpan={3} className="px-4 py-3 text-right font-bold">Total Nilai Barang</td>
                <td className="px-4 py-3 text-right font-bold text-primary text-lg font-mono">Rp {calculateTotal().toLocaleString("id-ID")}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/app/inventaris" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Batal</Link>
        <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy disabled:opacity-70">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Simpan Stok Masuk</>}
        </button>
      </div>
    </div>
  );
}
