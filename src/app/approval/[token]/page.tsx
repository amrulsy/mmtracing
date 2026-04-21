import { CheckCircle, XCircle, FileText, Car, Wrench, Clock, MessageSquare } from "lucide-react";

export default function ApprovalPage() {
  const stages = [
    { name: "Pembongkaran & Inspeksi", cost: "Rp 150.000", days: "1 hari" },
    { name: "Fabrikasi Custom Part", cost: "Rp 800.000", days: "3 hari" },
    { name: "Pemasangan & Assembly", cost: "Rp 600.000", days: "2 hari" },
    { name: "Finishing & Cat", cost: "Rp 400.000", days: "2 hari" },
    { name: "Quality Check", cost: "Rp 0", days: "1 hari" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">M</div>
          <h1 className="text-xl font-bold">Bengkel MM Tracing</h1>
          <p className="text-sm opacity-80 mt-1">Persetujuan Digital SPK</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 -mt-4 space-y-4">
        {/* Status Card */}
        <div className="glass-panel p-5 border-l-4 border-amber-500">
          <div className="flex items-center gap-3">
            <Clock className="text-amber-500" size={24} />
            <div>
              <p className="font-bold text-sm">Menunggu Persetujuan Anda</p>
              <p className="text-xs text-muted-foreground">Dikirim oleh Mbak Rina (Service Advisor) — 16 April 2026, 14:30</p>
            </div>
          </div>
        </div>

        {/* SPK Info */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-mono bg-surface-hover border border-surface-border px-2 py-0.5 rounded font-bold">SPK-2026-0042</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">Modifikasi</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Car size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Kendaraan</p>
                <p className="font-medium">Yamaha NMAX 155</p>
                <p className="text-xs font-mono text-muted-foreground">D 4567 EF</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Wrench size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Mekanik</p>
                <p className="font-medium">Agus Prayogo</p>
                <p className="text-xs text-muted-foreground">Specialist Modifikasi</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-surface-border">
            <p className="text-xs text-muted-foreground mb-1">Deskripsi Proyek:</p>
            <p className="text-sm">Custom bubut velg racing 17 inch dengan finishing chrome, termasuk bearing set dan balancing.</p>
          </div>
        </div>

        {/* Breakdown Stage & Biaya */}
        <div className="glass-panel p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <FileText size={16} className="text-primary" /> Rincian Tahapan & Biaya
          </h3>

          <div className="space-y-2 mb-4">
            {stages.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-hover/30 border border-surface-border">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.days}</p>
                  </div>
                </div>
                <span className="text-sm font-mono font-medium">{s.cost}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-primary/5 border-2 border-primary/20">
            <span className="font-bold">Total Estimasi</span>
            <span className="font-bold text-primary text-xl font-mono">Rp 2.500.000</span>
          </div>
          <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
            <span>DP Minimum (40%)</span>
            <span className="font-semibold font-mono">Rp 1.000.000</span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Estimasi Durasi</span>
            <span className="font-semibold">9 hari kerja</span>
          </div>
        </div>

        {/* Catatan Pelanggan */}
        <div className="glass-panel p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" /> Catatan untuk Bengkel (Opsional)
          </h3>
          <textarea
            placeholder="Tambahkan catatan atau permintaan khusus..."
            className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 pb-8">
          <button className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-red-500/30 bg-red-500/5 text-red-600 font-bold text-sm hover:bg-red-500/10 transition-colors">
            <XCircle size={20} />
            Tolak / Minta Revisi
          </button>
          <button className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors shadow-sm btn-glossy">
            <CheckCircle size={20} />
            Setujui & Bayar DP
          </button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground pb-4">
          Dengan menyetujui, Anda menyetujui estimasi biaya dan tahapan pengerjaan di atas. Biaya aktual dapat berubah ± 10% dari estimasi.
        </p>
      </div>
    </div>
  );
}
