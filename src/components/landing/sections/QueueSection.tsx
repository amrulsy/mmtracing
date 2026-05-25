"use client";

import { useState } from "react";
import { CheckCircle2, Calendar, Clock } from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";
import type { QueueData } from "../types";

interface QueueSectionProps {
  queueData: QueueData | null;
  lastUpdated?: Date;
}

export default function QueueSection({ queueData }: QueueSectionProps) {
  const [activeQueueTab, setActiveQueueTab] = useState("Semua");
  const [lastRefresh] = useState(() => new Date());

  const filterQueue = (q: QueueData["queue"][0]) => {
    if (activeQueueTab === "Semua") return true;
    if (activeQueueTab === "Servis Harian") return q.mode?.toLowerCase().includes("servis") || q.mode?.toLowerCase().includes("harian");
    if (activeQueueTab === "Modifikasi") return q.mode?.toLowerCase().includes("modif");
    if (activeQueueTab === "Bubut") return q.mode?.toLowerCase().includes("bubut");
    return true;
  };

  // Estimate wait time based on queue count
  const estimatedWait = queueData ? queueData.antri * 30 : 0; // ~30 min per vehicle

  return (
    <section id="antrian" className="py-16 lg:py-24 bg-surface-hover/30">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Live Antrian</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Status Bengkel Saat Ini</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Data real-time langsung dari sistem. Cek antrian sebelum datang ke bengkel.</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-4">
            <div className="glass-panel p-4 text-center">
              <p className="text-2xl font-black text-amber-500">{queueData?.antri ?? 0}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Antri</p>
            </div>
            <div className="glass-panel p-4 text-center">
              <p className="text-2xl font-black text-blue-500">{queueData?.dikerjakan ?? 0}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Dikerjakan</p>
            </div>
            <div className="glass-panel p-4 text-center">
              <p className="text-2xl font-black text-foreground">{queueData?.total ?? 0}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Total Aktif</p>
            </div>
          </div>

          {/* Estimated wait — NEW */}
          {estimatedWait > 0 && (
            <div className="flex items-center justify-center gap-2 mb-6 text-sm">
              <Clock size={14} className="text-amber-500" />
              <span className="text-muted-foreground">
                Estimasi waktu tunggu: <b className="text-foreground">±{estimatedWait} menit</b>
              </span>
            </div>
          )}

          {/* Category filter */}
          <div className="flex flex-wrap justify-center gap-1 mb-6 bg-surface-hover/50 rounded-xl border border-surface-border p-1 max-w-fit mx-auto">
            {["Semua", "Servis Harian", "Modifikasi", "Bubut"].map((t) => (
              <button key={t} onClick={() => setActiveQueueTab(t)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeQueueTab === t ? "bg-primary text-white shadow-glossy-primary" : "text-muted-foreground hover:bg-surface"}`}>
                {t}
              </button>
            ))}
          </div>

          {queueData && (
            <>
              {queueData.queue.length > 0 ? (
                <>
                  <div className="max-w-2xl mx-auto space-y-2">
                    {queueData.queue.filter(filterQueue).map((q, i) => (
                      <div key={i} className="glass-panel px-4 py-3 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${q.status === "dikerjakan" ? "bg-blue-500 animate-pulse" : "bg-amber-500"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono font-bold text-xs">{q.noSpk}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${q.status === "dikerjakan" ? "bg-blue-500/15 text-blue-500" : "bg-amber-500/15 text-amber-500"}`}>
                              {q.status === "dikerjakan" ? "🔧 Dikerjakan" : "⏳ Antri"}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-border text-muted-foreground font-medium">{q.mode}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {q.pelanggan} {q.kendaraan ? `· ${q.kendaraan}` : ""} {q.plat ? `(${q.plat})` : ""}
                          </p>
                        </div>
                        {q.status === "dikerjakan" && (
                          <div className="text-right shrink-0">
                            <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${q.progress}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{q.progress}%</span>
                          </div>
                        )}
                        {q.mekanik && <span className="text-[10px] text-muted-foreground hidden sm:block shrink-0">{q.mekanik}</span>}
                      </div>
                    ))}
                    {queueData.queue.filter(filterQueue).length === 0 && (
                      <div className="glass-panel p-6 text-center text-sm text-muted-foreground">
                        Tidak ada antrian untuk kategori {activeQueueTab} saat ini.
                      </div>
                    )}
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground mt-4">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse mr-1" />
                    Update otomatis setiap 30 detik · Nama pelanggan disamarkan untuk privasi
                  </p>
                </>
              ) : (
                <div className="max-w-md mx-auto glass-panel p-8 text-center mt-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-lg">Bengkel Siap Melayani!</h3>
                  <p className="text-sm text-muted-foreground mt-2">Saat ini tidak ada total antrian. Anda bisa langsung datang atau booking online.</p>
                  <a href="#booking" className="inline-flex items-center gap-2 mt-4 btn-glossy bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-glossy-primary">
                    <Calendar size={16} /> Booking Sekarang
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </AnimatedSection>
    </section>
  );
}
