"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Car, History, FileText, Wrench, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Pelanggan } from "@/lib/types";

export default function KendaraanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<Pelanggan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Next.js params
    const id = resolvedParams.id;
    if (!id) return;

    api.get<Pelanggan>(`/pelanggan/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error || "Data pelanggan tidak ditemukan"}</p>
        <Link href="/kendaraan" className="text-primary text-sm font-medium hover:underline">Kembali ke Daftar</Link>
      </div>
    );
  }

  const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  
  // Hitung total nilai transaksi dari SPK yang selesai/lunas
  const totalTransaksi = data.spk?.reduce((sum: number, s: any) => sum + (Number(s.totalHarga) || 0), 0) || 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link href="/kendaraan" className="p-2 hover:bg-surface-hover w-fit shrink-0 rounded-xl border border-surface-border glass transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Detail Rekam Jejak Pelanggan</h1>
          <p className="text-muted-foreground text-sm">PLG-{data.id.toString().padStart(4, "0")} — {data.name}</p>
        </div>
      </div>

      {/* Profil Pelanggan */}
      <div className="glass-panel p-4 md:p-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-5"><Car size={120} className="text-primary" /></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          <div className="flex items-center gap-4 md:col-span-2">
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-glossy-primary shrink-0">
              {data.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{data.name}</h2>
              <p className="text-sm text-muted-foreground">{data.phone}</p>
              {data.email && <p className="text-xs text-muted-foreground">{data.email}</p>}
              {data.address && <p className="text-xs text-muted-foreground mt-1">{data.address}</p>}
              <div className="mt-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  data.type === "bubut" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                  data.type === "both" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                }`}>
                  {data.type === "bubut" ? "🔧 Bubut Lepas" : data.type === "both" ? "🚗🔧 Kendaraan + Bubut" : "🚗 Kendaraan"}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-surface-border pt-4 lg:pt-0 lg:pl-4">
            <p className="text-xs text-muted-foreground">Bergabung Sejak</p>
            <p className="text-sm font-semibold">{formatDate(data.createdAt)}</p>
            <p className="text-xs text-muted-foreground mt-2">Total Kunjungan SPK</p>
            <p className="text-sm font-semibold">{data.spk?.length || 0} kali</p>
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-surface-border pt-4 lg:pt-0 lg:pl-4">
            <p className="text-xs text-muted-foreground">Total Nilai Transaksi</p>
            <p className="text-sm font-bold text-primary">{formatRp(totalTransaksi)}</p>
            <p className="text-xs text-muted-foreground mt-2">Status Loyalty</p>
            <p className="text-sm font-semibold text-amber-500">{data.loyaltyTier?.name || "Member Reguler"}</p>
          </div>
        </div>
      </div>

      {/* Garasi Kendaraan */}
      <div className="glass-panel p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2"><Car size={20} className="text-primary" /> Garasi Kendaraan</h3>
        </div>

        {data.kendaraan && data.kendaraan.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.kendaraan.map((k: any) => (
              <div key={k.id} className="border border-surface-border rounded-xl p-4 bg-surface-hover/20 hover:bg-surface-hover/40 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{k.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {k.tahun ? `Tahun ${k.tahun}` : ""} {k.warna ? `• Warna ${k.warna}` : ""}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-background border border-surface-border rounded text-xs font-bold font-mono">{k.plat}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                  <div><span className="font-medium text-foreground">No. Mesin:</span> {k.mesin || "---"}</div>
                  <div><span className="font-medium text-foreground">No. Rangka:</span> {k.rangka || "---"}</div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/spk/create?pelangganId=${data.id}&kendaraanId=${k.id}`} className="flex-1 text-center text-xs bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-lg transition-colors border border-primary/20 font-medium">
                    <FileText size={14} className="inline mr-1" /> Buat SPK
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-surface-border rounded-xl">
            <p className="text-sm text-muted-foreground">Belum ada kendaraan terdaftar</p>
          </div>
        )}
      </div>

      {/* Riwayat Servis Timeline */}
      <div className="glass-panel p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <h3 className="text-lg font-bold flex items-center gap-2"><History size={20} className="text-primary" /> Riwayat SPK (Servis & Bubut)</h3>
        </div>

        <div className="relative">
          {data.spk && data.spk.length > 0 ? (
            <>
              <div className="absolute left-4 top-0 bottom-0 w-px bg-surface-border hidden md:block"></div>
              
              {data.spk.map((item: any, i: number) => {
                const knd = data.kendaraan?.find((v: any) => v.id === item.kendaraanId);
                return (
                  <div key={item.id} className="flex gap-4 md:gap-6 mb-4 md:mb-6 last:mb-0 relative">
                    <div className="w-8 h-8 rounded-full bg-surface border-2 border-primary hidden md:flex items-center justify-center z-10 shrink-0">
                      {item.mode === "modifikasi" ? <Wrench size={14} className="text-primary" /> : <FileText size={14} className="text-primary" />}
                    </div>
                    <div className="flex-1 glass p-4 rounded-xl hover:-translate-y-0.5 transition-transform w-full overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-xs md:text-sm">{formatDate(item.createdAt)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.mode === "modifikasi" ? "bg-primary/10 text-primary border-primary/20" : item.mode === "bubut" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}`}>
                            {item.mode === "rutin" ? "Servis Rutin" : item.mode === "modifikasi" ? "Modifikasi" : "Bubut"}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center gap-2 mt-2">
                         <span className="text-xs font-mono font-medium text-muted-foreground w-1/2 min-w-[70px] truncate">SPK-{String(item.id).padStart(4, "0")}</span>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground my-2">
                        {item.mode === "bubut" ? "Pekerjaan Bubut Lepas" : knd ? `${knd.name} (${knd.plat})` : "Kendaraan Terhapus"}
                        {item.keluhan ? ` — Keluhan: ${item.keluhan}` : ""}
                      </p>
                      <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-surface-border">
                        <span className="text-sm font-bold">{formatRp(item.totalHarga)}</span>
                        <div className="flex gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${item.status === "selesai" || item.status === "lunas" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                            {item.status}
                          </span>
                          <Link href={`/spk/${item.id}`} className="text-[10px] bg-surface hover:bg-surface-hover px-2 py-0.5 rounded-full border border-surface-border text-foreground transition-colors font-medium">Buka SPK</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
             <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-surface-border rounded-xl">
               Pelanggan ini belum memiliki riwayat SPK.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
