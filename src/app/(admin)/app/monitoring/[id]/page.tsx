import Link from "next/link";
import { ArrowLeft, Camera, Clock, AlertCircle, CheckCircle, MessageSquare, Play, Pause } from "lucide-react";

export default function MonitoringDetailPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/app/monitoring" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Task SPK-0046
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse">Dikerjakan</span>
            </h1>
            <p className="text-muted-foreground text-sm">Servis Besar — Toyota Avanza (B 2345 EF)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 text-sm bg-amber-500/10 text-amber-600 border border-amber-500/20 px-4 py-2 rounded-xl font-medium hover:bg-amber-500/20 transition-colors">
            <AlertCircle size={16} /> Laporkan Kendala
          </button>
          <button className="flex items-center gap-2 text-sm bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-emerald-600 transition-colors btn-glossy">
            <CheckCircle size={16} /> Tandai Selesai
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: Detail */}
        <div className="lg:col-span-2 space-y-6">
          {/* Time Tracking (D-05) */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2"><Clock size={16} className="text-primary" /> Time Tracking</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="border border-surface-border rounded-xl p-4 bg-surface-hover/20">
                <p className="text-xs text-muted-foreground">Mulai Kerja</p>
                <p className="text-lg font-bold">09:30</p>
                <p className="text-[10px] text-muted-foreground">17 Apr 2026</p>
              </div>
              <div className="border border-blue-500/20 rounded-xl p-4 bg-blue-500/5">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Durasi Berjalan</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">02:45:12</p>
                <div className="flex justify-center gap-2 mt-2">
                  <button className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"><Pause size={12} /></button>
                  <button className="p-1.5 rounded-lg bg-surface border border-surface-border hover:bg-surface-hover text-muted-foreground"><Play size={12} /></button>
                </div>
              </div>
              <div className="border border-surface-border rounded-xl p-4 bg-surface-hover/20">
                <p className="text-xs text-muted-foreground">Estimasi Selesai</p>
                <p className="text-lg font-bold">14:00</p>
                <p className="text-[10px] text-muted-foreground">± 4 jam total</p>
              </div>
            </div>
          </div>

          {/* Checklist Pekerjaan */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Checklist Pengerjaan</h3>
            <div className="space-y-2">
              {[
                { task: "Ganti Oli Mesin (SAE 10W-40)", done: true },
                { task: "Ganti Filter Oli", done: true },
                { task: "Ganti Filter Udara", done: true },
                { task: "Cek & Top-up Coolant", done: false },
                { task: "Cek Sistem Rem (Pad & Disc)", done: false },
                { task: "Rotasi Ban & Cek Tekanan", done: false },
                { task: "Cek Aki & Kelistrikan", done: false },
                { task: "Test Drive & Final Check", done: false },
              ].map((item, i) => (
                <label key={i} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${item.done ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-surface-hover/20 border border-surface-border hover:bg-surface-hover/40"}`}>
                  <input type="checkbox" defaultChecked={item.done} className="w-4 h-4 rounded accent-primary" />
                  <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : "font-medium"}`}>{item.task}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 bg-surface border border-surface-border rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[37%]"></div>
              </div>
              <span className="text-xs font-bold text-emerald-600">3/8</span>
            </div>
          </div>

          {/* Foto Progress (D-04) */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Camera size={16} className="text-primary" /> Foto Progress</h3>
              <button className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover font-medium"><Camera size={14} /> Ambil Foto</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Kondisi Awal", time: "09:30" },
                { label: "Setelah Ganti Oli", time: "10:15" },
                { label: "Filter Udara Baru", time: "10:45" },
              ].map((p, i) => (
                <div key={i} className="border border-surface-border rounded-xl overflow-hidden bg-surface-hover/20 hover:bg-surface-hover/50 cursor-pointer transition-colors">
                  <div className="w-full h-32 bg-surface-border/30 flex items-center justify-center text-3xl text-muted-foreground">📷</div>
                  <div className="p-2">
                    <p className="text-xs font-medium">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground">{p.time}</p>
                  </div>
                </div>
              ))}
              {/* Upload placeholder */}
              <div className="border-2 border-dashed border-surface-border rounded-xl flex items-center justify-center h-32 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors">
                <div className="text-center">
                  <Camera size={24} className="mx-auto mb-1" />
                  <p className="text-xs">Upload Foto</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-6">
          {/* Info SPK */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Info SPK</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Pelanggan</span><span className="font-medium">Anton</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Kendaraan</span><span className="font-medium">Toyota Avanza</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">No. Polisi</span><span className="font-mono font-medium">B 2345 EF</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mekanik</span><span className="font-medium">Mas Budi</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Odometer</span><span className="font-medium">45,200 km</span></div>
              <div className="pt-3 border-t border-surface-border flex justify-between"><span className="font-bold">Estimasi</span><span className="font-bold text-primary">Rp 1.200.000</span></div>
            </div>
            <Link href="/app/spk/SPK-0046" className="w-full text-center block mt-4 text-sm border border-surface-border py-2 rounded-xl font-medium hover:bg-surface-hover transition-colors">
              Lihat Detail SPK
            </Link>
          </div>

          {/* Catatan Kendala (D-07) */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" /> Catatan Kendala
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-amber-600 font-bold">10:30</span>
                  <span className="text-xs font-medium">Filter cabin tidak tersedia</span>
                </div>
                <p className="text-xs text-muted-foreground">Stock habis. Sudah order ke supplier, estimasi besok pagi sampai.</p>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded mt-2 inline-block">Menunggu Part</span>
              </div>
            </div>
            <button className="w-full mt-3 text-sm border border-surface-border py-2 rounded-xl font-medium hover:bg-surface-hover transition-colors flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground">
              <MessageSquare size={14} /> Tambah Catatan
            </button>
          </div>

          {/* Update Status Cepat */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Update Status</h3>
            <div className="space-y-2">
              {[
                { label: "Selesai Dikerjakan", color: "bg-emerald-500 text-white", icon: CheckCircle },
                { label: "Kendala / Pending", color: "bg-amber-500 text-white", icon: AlertCircle },
                { label: "Kirim ke QC", color: "bg-blue-500 text-white", icon: CheckCircle },
              ].map((btn, i) => (
                <button key={i} className={`w-full flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-medium transition-all hover:opacity-90 ${btn.color}`}>
                  <btn.icon size={16} /> {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
