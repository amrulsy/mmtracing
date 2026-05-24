"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Filter, Download, Loader2, ArrowDownToLine, ArrowUpFromLine, ClipboardList, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { InventarisLog, Sparepart, Supplier } from "@/lib/types";

const TYPE_META: Record<string, { label: string; icon: any; className: string }> = {
  masuk: { label: "Masuk", icon: ArrowDownToLine, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  keluar: { label: "Keluar", icon: ArrowUpFromLine, className: "bg-red-500/10 text-red-500 border-red-500/20" },
  opname: { label: "Opname", icon: ClipboardList, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  retur: { label: "Retur", icon: RotateCcw, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

function MutasiInner() {
  const search = useSearchParams();
  const [type, setType] = useState<string>(search.get("type") || "");
  const [startDate, setStartDate] = useState<string>(search.get("start") || "");
  const [endDate, setEndDate] = useState<string>(search.get("end") || "");
  const [sparepartId, setSparepartId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const [logs, setLogs] = useState<InventarisLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    // Load filter dropdowns once
    Promise.all([
      api.getPaginated<Sparepart>("/sparepart", { limit: 500 }),
      api.getPaginated<Supplier>("/supplier", { limit: 200 }),
    ]).then(([sp, su]) => {
      setSpareparts(sp.data || []);
      setSuppliers(su.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit };
    if (type) params.type = type;
    if (sparepartId) params.sparepartId = sparepartId;
    if (supplierId) params.supplierId = supplierId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (q) params.q = q;
    api.getPaginated<InventarisLog>("/inventaris", params)
      .then(res => { setLogs(res.data || []); setTotal(res.pagination?.total || 0); })
      .catch(err => toast.error("Gagal memuat mutasi", err instanceof Error ? err.message : ""))
      .finally(() => setLoading(false));
  }, [type, sparepartId, supplierId, startDate, endDate, q, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const totals = useMemo(() => {
    const t = { masuk: 0, keluar: 0, opname: 0, retur: 0, nilai: 0 };
    for (const l of logs) {
      (t as any)[l.type] = ((t as any)[l.type] || 0) + l.qty;
      if (l.type === 'masuk') t.nilai += Number(l.totalHarga);
    }
    return t;
  }, [logs]);

  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const formatDate = (d: string) => new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handleExport = () => {
    const rows = [
      ["Tanggal", "Tipe", "Sparepart", "Qty", "Satuan", "Harga", "Total", "Supplier", "No PO", "Keterangan"],
      ...logs.map(l => [
        formatDate(l.createdAt), l.type, l.sparepart?.name || "",
        String(l.qty), l.sparepart?.satuan || "pcs",
        String(l.hargaSatuan), String(l.totalHarga),
        l.supplier?.name || "", l.noPo || "", (l.keterangan || "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mutasi-inventaris-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilter = () => {
    setType(""); setSparepartId(""); setSupplierId("");
    setStartDate(""); setEndDate(""); setQ(""); setPage(1);
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex items-center gap-4">
        <Link href="/app/inventaris" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Mutasi Inventaris</h1>
          <p className="text-muted-foreground text-sm">Riwayat semua pergerakan stok: masuk, keluar, opname, retur.</p>
        </div>
        <button onClick={handleExport} disabled={logs.length === 0} className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover disabled:opacity-50">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-panel p-3"><p className="text-[10px] text-muted-foreground uppercase">Total Baris</p><p className="text-lg font-bold">{total.toLocaleString("id-ID")}</p></div>
        <div className="glass-panel p-3"><p className="text-[10px] text-muted-foreground uppercase">Qty Masuk (page)</p><p className="text-lg font-bold text-emerald-600">{totals.masuk}</p></div>
        <div className="glass-panel p-3"><p className="text-[10px] text-muted-foreground uppercase">Qty Keluar (page)</p><p className="text-lg font-bold text-red-500">{totals.keluar}</p></div>
        <div className="glass-panel p-3"><p className="text-[10px] text-muted-foreground uppercase">Qty Retur (page)</p><p className="text-lg font-bold text-amber-600">{totals.retur}</p></div>
        <div className="glass-panel p-3"><p className="text-[10px] text-muted-foreground uppercase">Nilai Masuk (page)</p><p className="text-base font-bold font-mono text-emerald-600">{formatRp(totals.nilai)}</p></div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-muted-foreground" />
          <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Filter</span>
          <button onClick={resetFilter} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Reset</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="bg-surface border border-surface-border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Semua Tipe</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
            <option value="opname">Opname</option>
            <option value="retur">Retur</option>
          </select>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="bg-surface border border-surface-border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="bg-surface border border-surface-border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
          <select value={sparepartId} onChange={e => { setSparepartId(e.target.value); setPage(1); }} className="bg-surface border border-surface-border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Semua Sparepart</option>
            {spareparts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={supplierId} onChange={e => { setSupplierId(e.target.value); setPage(1); }} className="bg-surface border border-surface-border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Semua Supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="text" placeholder="Cari No PO / catatan" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} className="bg-surface border border-surface-border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Tanggal</th>
                <th className="px-3 py-2 text-left font-semibold">Tipe</th>
                <th className="px-3 py-2 text-left font-semibold">Sparepart</th>
                <th className="px-3 py-2 text-center font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Harga</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
                <th className="px-3 py-2 text-left font-semibold">Supplier / PO</th>
                <th className="px-3 py-2 text-left font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" size={16} /> Memuat...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Tidak ada data sesuai filter</td></tr>
              ) : logs.map((l) => {
                const meta = TYPE_META[l.type] || TYPE_META.masuk;
                const Icon = meta.icon;
                return (
                  <tr key={l.id} className="border-b border-surface-border hover:bg-surface-hover/30 transition-colors">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDate(l.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.className}`}>
                        <Icon size={10} /> {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{l.sparepart?.name || "—"}</td>
                    <td className="px-3 py-2 text-center font-mono">{l.qty} {l.sparepart?.satuan || "pcs"}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatRp(Number(l.hargaSatuan))}</td>
                    <td className={`px-3 py-2 text-right font-mono font-medium ${l.type === 'masuk' ? 'text-emerald-600' : l.type === 'keluar' || l.type === 'retur' ? 'text-red-500' : ''}`}>{formatRp(Number(l.totalHarga))}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="truncate">{l.supplier?.name || "—"}</div>
                      {l.noPo && <div className="text-[10px] text-muted-foreground font-mono">PO: {l.noPo}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[220px] truncate" title={l.keterangan || ""}>{l.keterangan || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-surface-border text-xs">
            <span className="text-muted-foreground">Halaman {page} dari {totalPages} · {total.toLocaleString("id-ID")} record</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded-lg border border-surface-border disabled:opacity-40">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded-lg border border-surface-border disabled:opacity-40">‹</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 rounded-lg border border-surface-border disabled:opacity-40">›</button>
              <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="px-2 py-1 rounded-lg border border-surface-border disabled:opacity-40">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MutasiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" size={16} /> Memuat...</div>}>
      <MutasiInner />
    </Suspense>
  );
}
