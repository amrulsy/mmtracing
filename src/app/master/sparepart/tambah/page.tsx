import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

export default function TambahSparepartPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/master/sparepart" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
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
            <label className="text-xs font-medium text-muted-foreground">Kode Sparepart</label>
            <input type="text" placeholder="Auto-generate (SP-XXX)" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Barcode / SKU</label>
            <input type="text" placeholder="Scan atau input manual" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nama Sparepart *</label>
          <input type="text" placeholder="Contoh: Oli Mesin Yamalube 10W-40 800ml" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Merk</label>
            <input type="text" placeholder="Yamaha, NGK, dll" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kategori *</label>
            <select className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option>Pilih Kategori</option>
              <option>Oli</option><option>Filter</option><option>Busi</option><option>Rem</option><option>CVT</option><option>Bearing</option><option>Elektronikal</option><option>Body</option><option>Lainnya</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Satuan</label>
            <select className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option>pcs</option><option>liter</option><option>set</option><option>pasang</option><option>meter</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Harga Beli (Rp) *</label>
            <input type="number" placeholder="0" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Harga Jual (Rp) *</label>
            <input type="number" placeholder="0" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Margin</label>
            <div className="w-full bg-surface-hover border border-surface-border rounded-xl px-3 py-2.5 text-sm text-right font-mono font-bold text-emerald-600">— %</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Stok Awal</label>
            <input type="number" defaultValue={0} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Stok Minimum (Alert)</label>
            <input type="number" defaultValue={5} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Keterangan</label>
          <textarea placeholder="Catatan tambahan..." className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[60px]" />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/master/sparepart" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Batal</Link>
        <button className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy">
          <Save size={18} /> Simpan Sparepart
        </button>
      </div>
    </div>
  );
}
