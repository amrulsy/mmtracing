"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ClipboardCheck, CheckCircle, AlertTriangle, Clock, Eye, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface Inspeksi {
  id: number;
  kendaraanId: number;
  tanggal: string; // ISO Date String
  kilometer: number;
  kondisiBody?: any;
  kondisiMesin?: any;
  kondisiKelistrikan?: any;
  status: string; // e.g. "draft", "locked" (mocking logic)
  kendaraan: {
    name: string;
    noPolisi: string;
    pelanggan?: { name: string };
  };
  spk?: { noSpk: string };
}

export default function InspeksiListPage() {
  const [inspections, setInspections] = useState<Inspeksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get<Inspeksi[]>("/inspeksi")
      .then(res => setInspections((res.data || []).slice(0, 200))) // limit client-side to 200
      .catch(err => setError(err instanceof Error ? err.message : "Gagal memuat inspeksi"))
      .finally(() => setLoading(false));
  }, []);

  const countKondisi = (data: any, target: 'baik' | 'perhatian' | 'rusak') => {
    if (!data || typeof data !== 'object') return 0;
    return Object.values(data).filter((v) => v === target).length;
  };

  const filteredInspections = inspections.filter(insp => {
    if (!search) return true;
    const term = search.toLowerCase();
    return insp.kendaraan?.noPolisi?.toLowerCase().includes(term) ||
           insp.kendaraan?.name?.toLowerCase().includes(term) ||
           insp.kendaraan?.pelanggan?.name?.toLowerCase().includes(term);
  });

  const totalBulanIni = inspections.filter(i => {
    const d = new Date(i.tanggal);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  // hitung temuan perhatian / rusak
  let temuan = 0;
  inspections.forEach(i => {
    ['kondisiBody', 'kondisiMesin', 'kondisiKelistrikan'].forEach(kategori => {
      temuan += countKondisi((i as any)[kategori], 'perhatian');
      temuan += countKondisi((i as any)[kategori], 'rusak');
    });
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ClipboardCheck className="text-primary" size={28} /> Inspeksi Kendaraan
        </h1>
        <p className="text-muted-foreground">Riwayat inspeksi kondisi kendaraan saat masuk bengkel.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Inspeksi", value: loading ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : inspections.length, color: "" },
          { label: "Bulan Ini", value: loading ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : totalBulanIni, color: "text-primary" },
          { label: "Temuan Perhatian / Rusak", value: loading ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : temuan, color: "text-amber-500" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-surface-border w-full max-w-md focus-within:ring-1 focus-within:ring-primary">
          <Search size={18} className="text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari pelanggan atau nopol..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {error ? (
           <div className="glass-panel p-8 text-center text-red-500">{error}</div>
        ) : loading ? (
           Array.from({length: 4}).map((_, i) => <div key={i} className="glass-panel p-4"><Skeleton className="h-10 w-full" /></div>)
        ) : filteredInspections.length === 0 ? (
           <div className="glass-panel p-8 text-center text-muted-foreground">Tidak ada riwayat inspeksi</div>
        ) : filteredInspections.map((insp) => {
          let baik = 0, perhatian = 0, rusak = 0;
          ['kondisiBody', 'kondisiMesin', 'kondisiKelistrikan'].forEach(kategori => {
            baik += countKondisi((insp as any)[kategori], 'baik');
            perhatian += countKondisi((insp as any)[kategori], 'perhatian');
            rusak += countKondisi((insp as any)[kategori], 'rusak');
          });

          return (
            <Link key={insp.id} href={`/inspeksi/${insp.id}`} className="glass-panel p-4 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-glossy transition-all block">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${insp.status === "draft" ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                {insp.status === "draft" ? <Clock size={20} className="text-amber-500" /> : <CheckCircle size={20} className="text-emerald-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold truncate">{insp.kendaraan?.name}</p>
                  <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-surface-hover border border-surface-border">{insp.kendaraan?.noPolisi}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${insp.status === "draft" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                    {insp.status || "Terkunci"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                   {insp.kendaraan?.pelanggan?.name || "Pelanggan"} • {new Date(insp.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-xs">
                  <CheckCircle size={12} className="text-emerald-500" /> <span className="font-bold">{baik}</span>
                </div>
                {perhatian > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <AlertTriangle size={12} className="text-amber-500" /> <span className="font-bold text-amber-500">{perhatian}</span>
                  </div>
                )}
                {rusak > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <AlertTriangle size={12} className="text-red-500" /> <span className="font-bold text-red-500">{rusak}</span>
                  </div>
                )}
                <Eye size={16} className="text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
