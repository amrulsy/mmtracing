import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Calendar, CheckCircle } from "lucide-react";

export default function ExportLaporanPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/laporan" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
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
              <input type="date" defaultValue="2026-04-01" className="flex-1 px-3 py-2.5 bg-transparent text-sm focus:outline-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tanggal Akhir</label>
            <div className="flex items-center bg-surface border border-surface-border rounded-xl overflow-hidden">
              <span className="px-3 py-2.5 bg-surface-hover border-r border-surface-border"><Calendar size={16} className="text-muted-foreground" /></span>
              <input type="date" defaultValue="2026-04-17" className="flex-1 px-3 py-2.5 bg-transparent text-sm focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Pilih Jenis Laporan</h3>
        <div className="space-y-3">
          {[
            { name: "Laporan Pendapatan", desc: "Breakdown pendapatan harian/mingguan, per tipe layanan (servis rutin, modifikasi)", icon: "💰", checked: true },
            { name: "Laporan Performa Mekanik", desc: "Jumlah SPK selesai, rata-rata waktu pengerjaan, efisiensi per mekanik", icon: "🔧", checked: true },
            { name: "Laporan Pelanggan", desc: "Top spender, pelanggan berulang, retensi, churn rate", icon: "👥", checked: false },
            { name: "Laporan SPK", desc: "Daftar semua SPK, status, tipe layanan, estimasi vs aktual", icon: "📝", checked: false },
            { name: "Laporan Outstanding DP", desc: "DP yang belum lunas, aging report, reminder list", icon: "⏰", checked: true },
            { name: "Laporan Kendaraan", desc: "Kendaraan terdaftar, frekuensi servis, reminder perawatan", icon: "🚗", checked: false },
          ].map((report, i) => (
            <label key={i} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              report.checked
                ? "bg-primary/5 border-primary/20 shadow-sm"
                : "border-surface-border hover:bg-surface-hover/30 hover:border-surface-border"
            }`}>
              <input type="checkbox" defaultChecked={report.checked} className="w-4 h-4 rounded accent-primary mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{report.icon}</span>
                  <span className="text-sm font-semibold">{report.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{report.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Format Export</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="p-6 rounded-xl border-2 border-primary bg-primary/5 flex flex-col items-center gap-3 text-primary font-semibold transition-all hover:bg-primary/10">
            <FileText size={32} />
            <div className="text-center">
              <p className="text-sm font-bold">PDF</p>
              <p className="text-[10px] text-muted-foreground font-normal">Format laporan cetak</p>
            </div>
          </button>
          <button className="p-6 rounded-xl border-2 border-surface-border flex flex-col items-center gap-3 text-muted-foreground font-semibold transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-600">
            <FileSpreadsheet size={32} />
            <div className="text-center">
              <p className="text-sm font-bold">Excel (.xlsx)</p>
              <p className="text-[10px] text-muted-foreground font-normal">Format spreadsheet</p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <Link href="/laporan" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">
          Batal
        </Link>
        <button className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy">
          <Download size={18} />
          Generate & Download
        </button>
      </div>
    </div>
  );
}
