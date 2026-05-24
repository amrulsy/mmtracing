"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Calendar, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

const REPORT_TYPES = [
  { id: "pendapatan", name: "Laporan Pendapatan", desc: "Breakdown pendapatan harian per tipe layanan (Servis Rutin, Modifikasi)", icon: "💰", available: true, defaultOn: true },
  { id: "mekanik", name: "Laporan Performa Mekanik", desc: "Jumlah SPK selesai dan pendapatan yang dihasilkan per mekanik", icon: "🔧", available: true, defaultOn: true },
  { id: "pelanggan", name: "Laporan Pelanggan", desc: "Top spender dan frekuensi kunjungan pelanggan", icon: "👥", available: true, defaultOn: false },
  { id: "spk", name: "Laporan SPK", desc: "Daftar SPK dalam periode yang dipilih beserta status dan nominal", icon: "📝", available: true, defaultOn: false },
  { id: "dp", name: "Laporan Outstanding DP", desc: "DP yang belum lunas — akan hadir segera", icon: "⏰", available: false, defaultOn: false },
  { id: "kendaraan", name: "Laporan Kendaraan", desc: "Kendaraan terdaftar dan frekuensi servis — akan hadir segera", icon: "🚗", available: false, defaultOn: false },
];

const fmtRp = (n: number | string) => `Rp ${Number(n).toLocaleString("id-ID")}`;

const he = (s: string | null | undefined) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildCSV(rows: (string | number)[][]): string {
  return rows.map(r =>
    r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function ExportLaporanPage() {
  const searchParams = useSearchParams();
  const qStart = searchParams?.get("start") || "";
  const qEnd = searchParams?.get("end") || "";
  const [startDate, setStartDate] = useState(
    () => qStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(() => qEnd || new Date().toISOString().split("T")[0]);
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(REPORT_TYPES.filter(r => r.available && r.defaultOn).map(r => r.id))
  );
  const [loading, setLoading] = useState(false);

  const toggle = (id: string, available: boolean) => {
    if (!available) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const validSelected = REPORT_TYPES.filter(r => r.available && selected.has(r.id));

  const handleExport = async () => {
    if (validSelected.length === 0) {
      toast.error("Validasi", "Pilih minimal satu jenis laporan");
      return;
    }
    if (startDate > endDate) {
      toast.error("Validasi", "Tanggal mulai tidak boleh lebih besar dari tanggal akhir");
      return;
    }

    setLoading(true);
    try {
      const params = { startDate, endDate };
      const results = await Promise.all(
        validSelected.map(async r => {
          switch (r.id) {
            case "pendapatan": { const res = await api.get<any>("/laporan/pendapatan", params); return { ...r, raw: res.data }; }
            case "mekanik":    { const res = await api.get<any>("/laporan/mekanik");            return { ...r, raw: Array.isArray(res.data) ? res.data : [] }; }
            case "pelanggan":  { const res = await api.get<any>("/laporan/pelanggan");          return { ...r, raw: res.data }; }
            case "spk":        { const res = await api.getPaginated<any>("/spk", { limit: 500 }); return { ...r, raw: res.data }; }
            default:           return { ...r, raw: null };
          }
        })
      );

      const periodeLabel = `${startDate} s/d ${endDate}`;

      if (format === "excel") {
        const lines: string[] = [
          `"MMT Racing — Export Laporan"`,
          `"Periode: ${periodeLabel}"`,
          `"Dibuat: ${new Date().toLocaleString("id-ID")}"`,
          "",
        ];

        for (const r of results) {
          lines.push(`"=== ${r.name} ==="`);
          if (r.id === "pendapatan") {
            const daily: any[] = r.raw?.daily || [];
            lines.push(buildCSV([
              ["Tanggal", "Servis Rutin (Rp)", "Modifikasi (Rp)", "Lainnya (Rp)", "Total (Rp)"],
              ...daily.map(d => [d.date, d.rutin || 0, d.modifikasi || 0, d.bubut || 0, d.total || 0]),
              ["", "", "", "TOTAL:", r.raw?.total || 0],
            ]));
          } else if (r.id === "mekanik") {
            const data: any[] = r.raw || [];
            lines.push(buildCSV([
              ["#", "Nama Mekanik", "Spesialisasi", "SPK Selesai", "Total Pendapatan (Rp)"],
              ...data.map((m, i) => [i + 1, m.name, m.spesialisasi || "-", m.spkSelesai || 0, m.totalPendapatan || 0]),
            ]));
          } else if (r.id === "pelanggan") {
            const spenders: any[] = r.raw?.topSpenders || [];
            lines.push(buildCSV([
              ["#", "Nama Pelanggan", "Kunjungan", "Total Transaksi (Rp)"],
              ...spenders.map((c, i) => [i + 1, c.name, c._count?.spk || 0, Number(c.totalTrx) || 0]),
            ]));
          } else if (r.id === "spk") {
            const spks: any[] = r.raw || [];
            lines.push(buildCSV([
              ["No. SPK", "Pelanggan", "Kendaraan", "Tipe", "Mekanik", "Status", "Total (Rp)"],
              ...spks.map(s => [s.noSpk, s.pelanggan?.name || "-", s.kendaraan?.name || "-", s.mode, s.mekanik?.name || "-", s.status, Number(s.totalHarga) || 0]),
            ]));
          }
          lines.push("");
        }

        triggerDownload(lines.join("\n"), `laporan_${startDate}_${endDate}.csv`);
        toast.success("Berhasil", "File CSV berhasil diunduh. Buka dengan Excel atau Google Sheets.");

      } else {
        let sections = "";
        for (const r of results) {
          if (r.id === "pendapatan") {
            const daily: any[] = r.raw?.daily || [];
            sections += `
              <h2>💰 ${r.name}</h2>
              <p>Total Periode: <b>${fmtRp(r.raw?.total || 0)}</b></p>
              <table><thead><tr><th>Tanggal</th><th>Servis Rutin</th><th>Modifikasi</th><th>Lainnya</th><th>Total</th></tr></thead>
              <tbody>${daily.map((d: any) => `<tr><td>${he(d.date)}</td><td>${fmtRp(d.rutin||0)}</td><td>${fmtRp(d.modifikasi||0)}</td><td>${fmtRp(d.bubut||0)}</td><td><b>${fmtRp(d.total||0)}</b></td></tr>`).join("")}</tbody>
              <tfoot><tr><th colspan="4">TOTAL</th><th>${fmtRp(r.raw?.total||0)}</th></tr></tfoot></table>`;
          } else if (r.id === "mekanik") {
            const data: any[] = r.raw || [];
            sections += `
              <h2>🔧 ${he(r.name)}</h2>
              <table><thead><tr><th>#</th><th>Nama Mekanik</th><th>Spesialisasi</th><th>SPK Selesai</th><th>Total Pendapatan</th></tr></thead>
              <tbody>${data.map((m: any, i: number) => `<tr><td>${i+1}</td><td>${he(m.name)}</td><td>${he(m.spesialisasi)}</td><td>${m.spkSelesai||0}</td><td>${fmtRp(m.totalPendapatan||0)}</td></tr>`).join("")}</tbody></table>`;
          } else if (r.id === "pelanggan") {
            const spenders: any[] = r.raw?.topSpenders || [];
            sections += `
              <h2>👥 ${he(r.name)}</h2>
              <table><thead><tr><th>#</th><th>Nama Pelanggan</th><th>Kunjungan</th><th>Total Transaksi</th></tr></thead>
              <tbody>${spenders.map((c: any, i: number) => `<tr><td>${i+1}</td><td>${he(c.name)}</td><td>${c._count?.spk||0}x</td><td>${fmtRp(Number(c.totalTrx)||0)}</td></tr>`).join("")}</tbody></table>`;
          } else if (r.id === "spk") {
            const spks: any[] = r.raw || [];
            sections += `
              <h2>📝 ${he(r.name)}</h2>
              <table><thead><tr><th>No. SPK</th><th>Pelanggan</th><th>Kendaraan</th><th>Tipe</th><th>Mekanik</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>${spks.map((s: any) => `<tr><td>${he(s.noSpk)}</td><td>${he(s.pelanggan?.name)}</td><td>${he(s.kendaraan?.name)}</td><td>${he(s.mode)}</td><td>${he(s.mekanik?.name)}</td><td>${he(s.status)}</td><td>${fmtRp(Number(s.totalHarga)||0)}</td></tr>`).join("")}</tbody></table>`;
          }
        }

        const printWin = window.open("", "_blank", "width=1050,height=750");
        if (!printWin) { toast.error("Popup diblokir", "Izinkan popup pada browser ini untuk membuka laporan PDF."); return; }

        printWin.document.write(`<!DOCTYPE html><html><head>
          <meta charset="UTF-8">
          <title>Laporan MMT Racing — ${periodeLabel}</title>
          <style>
            *{box-sizing:border-box} body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:24px}
            .hdr{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:4px}
            .hdr h1{font-size:17px;margin:0 0 3px} .hdr p{font-size:10px;color:#555;margin:0}
            h2{font-size:13px;margin:22px 0 6px;padding-bottom:4px;border-bottom:1px solid #aaa}
            table{width:100%;border-collapse:collapse;margin-bottom:4px;page-break-inside:avoid}
            th{background:#f0f0f0;border:1px solid #bbb;padding:5px 7px;text-align:left;font-size:10px}
            td{border:1px solid #ddd;padding:4px 7px} tr:nth-child(even) td{background:#fafafa}
            tfoot th{background:#e0e0e0}
            @media print{body{padding:0}}
          </style>
        </head><body>
          <div class="hdr"><h1>Laporan Operasional — MMT Racing</h1>
          <p>Periode: ${periodeLabel} &nbsp;|&nbsp; Dibuat: ${new Date().toLocaleString("id-ID")}</p></div>
          ${sections}
        </body></html>`);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => printWin.print(), 600);
        toast.success("Berhasil", "Jendela print terbuka. Pilih 'Save as PDF' untuk menyimpan.");
      }
    } catch (err: unknown) {
      toast.error("Gagal export", err instanceof Error ? err.message : "Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/app/laporan" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Export Laporan</h1>
          <p className="text-muted-foreground text-sm">Pilih jenis laporan dan format untuk di-download.</p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Periode Laporan</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tanggal Mulai</label>
            <div className="flex items-center bg-surface border border-surface-border rounded-xl overflow-hidden">
              <span className="px-3 py-2.5 bg-surface-hover border-r border-surface-border"><Calendar size={16} className="text-muted-foreground" /></span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 px-3 py-2.5 bg-transparent text-sm focus:outline-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tanggal Akhir</label>
            <div className="flex items-center bg-surface border border-surface-border rounded-xl overflow-hidden">
              <span className="px-3 py-2.5 bg-surface-hover border-r border-surface-border"><Calendar size={16} className="text-muted-foreground" /></span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 px-3 py-2.5 bg-transparent text-sm focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Pilih Jenis Laporan</h3>
        <div className="space-y-3">
          {REPORT_TYPES.map(report => {
            const isChecked = selected.has(report.id);
            return (
              <label key={report.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                !report.available ? "opacity-40 cursor-not-allowed" :
                isChecked ? "bg-primary/5 border-primary/20 shadow-sm cursor-pointer" :
                "border-surface-border hover:bg-surface-hover/30 cursor-pointer"
              }`}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={!report.available}
                  onChange={() => toggle(report.id, report.available)}
                  className="w-4 h-4 rounded accent-primary mt-1 shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{report.icon}</span>
                    <span className="text-sm font-semibold">{report.name}</span>
                    {!report.available && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-muted-foreground border border-surface-border">Segera</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{report.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Format Export</h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setFormat("pdf")} className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 font-semibold transition-all hover:shadow-sm ${format === "pdf" ? "border-primary bg-primary/5 text-primary" : "border-surface-border text-muted-foreground hover:border-primary/30"}`}>
            <FileText size={32} />
            <div className="text-center">
              <p className="text-sm font-bold">PDF</p>
              <p className="text-[10px] text-muted-foreground font-normal">Buka dialog print → Save as PDF</p>
            </div>
          </button>
          <button onClick={() => setFormat("excel")} className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 font-semibold transition-all hover:shadow-sm ${format === "excel" ? "border-emerald-500 bg-emerald-500/5 text-emerald-600" : "border-surface-border text-muted-foreground hover:border-emerald-500/30"}`}>
            <FileSpreadsheet size={32} />
            <div className="text-center">
              <p className="text-sm font-bold">Excel / CSV</p>
              <p className="text-[10px] text-muted-foreground font-normal">Buka dengan Excel atau Google Sheets</p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/app/laporan" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">
          Batal
        </Link>
        <button
          onClick={handleExport}
          disabled={loading || validSelected.length === 0}
          className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> Generate & Download</>}
        </button>
      </div>
    </div>
  );
}
