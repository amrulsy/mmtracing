"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit, TrendingUp, TrendingDown, Package, BarChart3, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import { toast } from "@/lib/toast";

interface SparepartDetail {
  id: number;
  kode: string;
  name: string;
  merk?: string;
  kategori?: { name: string };
  supplier?: { name: string };
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
  inventarisLog: Array<{
    id: number;
    tanggal: string | Date;
    createdAt: string;
    type: string;
    qty: number;
    noPo?: string;
    keterangan?: string;
  }>;
}

export default function SparepartDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<SparepartDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/sparepart/${id}`)
      .then(res => setData(res.data as SparepartDetail))
      .catch(err => toast.error("Gagal", err.message || "Gagal memuat detail sparepart"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2"/> Memuat informasi...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Data sparepart tidak ditemukan.</div>;

  const b = Number(data.hargaBeli);
  const j = Number(data.hargaJual);
  const margin = b > 0 ? Math.round(((j - b) / b) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/master/sparepart" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
            <p className="text-muted-foreground text-sm font-mono">
              {data.kode} • {data.merk || "No Brand"} • {data.kategori?.name || "Umum"}
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover font-medium">
          <Edit size={16} /> Edit
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: "Harga Beli", value: formatRupiah(b), icon: TrendingDown, color: "" },
          { label: "Harga Jual", value: formatRupiah(j), icon: TrendingUp, color: "text-primary" },
          { label: "Margin", value: `${margin}%`, icon: BarChart3, color: "text-emerald-500" },
          { label: "Stok Saat Ini", value: `${data.stok} pcs`, icon: Package, color: data.stok <= data.stokMinimum ? "text-amber-500" : "" },
        ].map((c, i) => (
          <div key={i} className="glass-panel p-4 hover:shadow-glossy transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
              <c.icon size={16} className="text-muted-foreground" />
            </div>
            <p className={`text-xl font-bold font-mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Kartu Stok */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Riwayat Log Kartu Stok</h3>
          <div className="space-y-2">
            {data.inventarisLog && data.inventarisLog.length > 0 ? (
              data.inventarisLog.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-surface-border hover:bg-surface-hover/30 transition-colors text-sm">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.type === "masuk" || r.type === "opname" && r.qty > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
                  {r.type === "masuk" || r.qty > 0 ? "+" : "−"}{Math.abs(r.qty)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate capitalize">{r.type} {r.keterangan ? `- ${r.keterangan}` : ""}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("id-ID")} • Ref: {r.noPo || r.type.toUpperCase()}</p>
                </div>
              </div>
            ))) : (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat pergerakan stok</p>
            )}
          </div>
        </div>

        {/* Informasi Supplier */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Info Supplier Terakhir</h3>
          <div className="p-3 rounded-xl border border-surface-border bg-surface-hover/20">
            {data.supplier ? (
              <>
                <p className="text-sm font-semibold">{data.supplier.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Ini adalah referensi supplier terbaru saat barang dimasukkan ke Gudang.</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak tercatat supplier / dibeli secara umum.</p>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
