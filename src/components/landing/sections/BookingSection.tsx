"use client";

import { useState, type FormEvent, useEffect } from "react";
import { 
  Calendar, ArrowRight, Check, Loader2, AlertCircle, 
  CheckCircle2, Wrench, Settings, Hammer, Zap, 
  MessageCircle, Copy, CarFront
} from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";
import type { ContactData, BookingFormData } from "../types";

interface BookingSectionProps {
  contact: ContactData;
}

const LAYANAN_OPTIONS = [
  { id: "Servis Rutin", icon: Wrench, desc: "Ganti oli, tune up, CVT, kampas rem", est: "30-60 Menit" },
  { id: "Modifikasi", icon: Settings, desc: "Bore up, exhaust, suspension, body", est: "1-7 Hari" },
  { id: "Jasa Bubut Custom", icon: Hammer, desc: "Bubut velg, spacer, komponen CNC", est: "1-3 Hari" },
  { id: "Express Service", icon: Zap, desc: "Layanan prioritas tanpa antri lama", est: "< 30 Menit" },
];

const JENIS_KENDARAAN = ["Motor Matic", "Motor Sport", "Motor Bebek", "Mobil", "Tanpa Kendaraan (Bawa Part)"];

export default function BookingSection({ contact }: BookingSectionProps) {
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    nama: "", whatsapp: "", jenisKendaraan: "Motor Matic", merkTipe: "",
    platNomor: "", layanan: "", tanggal: "", jamPreferensi: "", keluhan: "", _hp: "",
  });
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingMsg, setBookingMsg] = useState("");
  const [bookingIdStr, setBookingIdStr] = useState("");
  const [bookingStep, setBookingStep] = useState(1);
  const [waError, setWaError] = useState("");
  const [copied, setCopied] = useState(false);
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
  }, []);

  const validateWa = (v: string) => {
    const clean = v.replace(/[^0-9]/g, "");
    if (!clean) { setWaError(""); return; }
    if (!/^(08|628)[0-9]{8,12}$/.test(clean)) setWaError("Format: 08xx atau 628xx");
    else setWaError("");
  };

  const isWaValid = /^(08|628)[0-9]{8,12}$/.test(bookingForm.whatsapp.replace(/[^0-9]/g, ""));
  const canGoStep2 = bookingForm.nama.trim().length >= 2 && isWaValid && bookingForm.jenisKendaraan;
  const canGoStep3 = canGoStep2 && bookingForm.layanan;

  const isTanpaKendaraan = bookingForm.jenisKendaraan === "Tanpa Kendaraan (Bawa Part)";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canGoStep3) return;
    setBookingStatus("loading");
    try {
      const res = await fetch("/api/v1/landing/booking", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingForm),
      });
      const json = await res.json();
      if (json.success) {
        setBookingStatus("success");
        setBookingIdStr(`#${json.data.id}`);
        setBookingMsg(json.message || "Booking berhasil! Kami akan menghubungi via WhatsApp.");
        const waContact = contact.whatsapp || "62274123456";
        const kendStr = isTanpaKendaraan ? `Part: ${bookingForm.merkTipe || "Bawa Part"}` : `Kendaraan: ${bookingForm.jenisKendaraan} ${bookingForm.merkTipe}`;
        const waMsg = encodeURIComponent(`Halo MMT Racing,\nSaya ${bookingForm.nama} baru saja booking online #${json.data.id}.\nLayanan: ${bookingForm.layanan}\n${kendStr}\nTanggal: ${bookingForm.tanggal || "Secepatnya"}\nMohon konfirmasinya. Terima kasih!`);
        setTimeout(() => { window.open(`https://wa.me/${waContact}?text=${waMsg}`, "_blank"); }, 2000);
      } else {
        setBookingStatus("error");
        setBookingMsg(json.message || "Gagal mengirim booking");
      }
    } catch {
      setBookingStatus("error");
      setBookingMsg("Terjadi kesalahan. Silakan coba lagi.");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingIdStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setBookingForm({ nama: "", whatsapp: "", jenisKendaraan: "Motor Matic", merkTipe: "", platNomor: "", layanan: "", tanggal: "", jamPreferensi: "", keluhan: "", _hp: "" });
    setBookingStep(1);
    setBookingStatus("idle");
  };

  const inputCls = "w-full bg-surface-hover/50 border border-surface-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background";
  const labelCls = "text-xs font-semibold text-muted-foreground mb-1.5 block";
  const f = bookingForm;
  const setF = (partial: Partial<BookingFormData>) => setBookingForm({ ...bookingForm, ...partial });

  const selectedLayanan = LAYANAN_OPTIONS.find(l => l.id === f.layanan);

  return (
    <section id="booking" className="py-16 lg:py-24 relative overflow-hidden">
      {/* Decorative bg */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 relative z-10">
        <AnimatedSection className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Reservasi Cepat</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">Booking Jadwal Servis</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Tentukan jadwal Anda tanpa harus antri lama di bengkel. Kami akan mengonfirmasi ketersediaan via WhatsApp.</p>
        </AnimatedSection>
        
        <AnimatedSection>
          {bookingStatus === "success" ? (
            <div className="glass-panel p-8 lg:p-12 text-center max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                <div className="relative w-full h-full bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 size={40} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground mb-2">Booking Berhasil!</h3>
                <p className="text-muted-foreground">{bookingMsg}</p>
              </div>
              <div className="bg-surface-hover/50 border border-surface-border rounded-2xl p-4 flex items-center justify-between max-w-sm mx-auto">
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">ID Booking Anda</p>
                  <p className="font-mono text-lg font-bold text-primary">{bookingIdStr}</p>
                </div>
                <button onClick={copyToClipboard} className="p-2.5 rounded-xl hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs font-medium">
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  {copied ? "Disalin!" : "Salin"}
                </button>
              </div>
              <div className="pt-4 space-y-3">
                <p className="text-xs font-medium text-emerald-500 animate-pulse">Membuka WhatsApp dalam beberapa detik...</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Halo MMT Racing, saya ingin konfirmasi booking ${bookingIdStr}`)}`} target="_blank" rel="noopener noreferrer" className="btn-glossy bg-[#25D366] text-white px-6 py-2.5 rounded-xl text-sm font-bold w-full sm:w-auto shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2">
                    <MessageCircle size={18} /> Buka WhatsApp Manual
                  </a>
                  <button onClick={resetForm} className="px-6 py-2.5 rounded-xl text-sm font-medium border border-surface-border hover:bg-surface-hover transition-colors w-full sm:w-auto">
                    Buat Booking Baru
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel max-w-3xl mx-auto overflow-hidden">
              {/* Progress Bar Header */}
              <div className="bg-surface-hover/30 border-b border-surface-border p-4 lg:p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Langkah {bookingStep} dari 3</span>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {bookingStep === 1 ? "Data Diri & Kendaraan" : bookingStep === 2 ? "Detail Layanan" : "Konfirmasi"}
                  </span>
                </div>
                <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden flex">
                  <div className={`h-full bg-primary transition-all duration-500 ease-out`} style={{ width: `${(bookingStep / 3) * 100}%` }} />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-5 lg:p-8 space-y-6">
                {/* Honeypot */}
                <input type="text" name="_hp" value={f._hp} onChange={(e) => setF({ _hp: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" />

                {bookingStatus === "error" && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm animate-in fade-in">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="font-medium">{bookingMsg}</p>
                  </div>
                )}

                {/* STEP 1: Data Diri & Kendaraan */}
                {bookingStep === 1 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls}>Nama Lengkap <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input type="text" required value={f.nama} onChange={(e) => setF({ nama: e.target.value })} placeholder="Cth: Budi Santoso" className={inputCls} />
                          {f.nama.trim().length >= 2 && <Check size={16} className="absolute right-4 top-3.5 text-emerald-500" />}
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>No. WhatsApp <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input type="tel" required value={f.whatsapp} onChange={(e) => { setF({ whatsapp: e.target.value }); validateWa(e.target.value); }} placeholder="Cth: 081234567890" className={`${inputCls} ${waError ? "ring-2 ring-red-500/50 border-red-500/50" : ""}`} />
                          {isWaValid && <Check size={16} className="absolute right-4 top-3.5 text-emerald-500" />}
                        </div>
                        {waError && <p className="text-[10px] text-red-500 mt-1.5">{waError}</p>}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5 mt-2">
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Kondisi Bawaan <span className="text-red-500">*</span></label>
                        <div className="flex flex-wrap gap-2">
                          {JENIS_KENDARAAN.map(jk => (
                            <button
                              key={jk} type="button"
                              onClick={() => { 
                                if (jk === "Tanpa Kendaraan (Bawa Part)") {
                                  setF({ jenisKendaraan: jk, platNomor: "" });
                                } else {
                                  setF({ jenisKendaraan: jk });
                                }
                              }}
                              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${f.jenisKendaraan === jk ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" : "bg-surface-hover/30 border-surface-border text-muted-foreground hover:bg-surface-hover"}`}
                            >
                              {jk}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {!isTanpaKendaraan ? (
                      <div className="grid sm:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                          <label className={labelCls}>Merek &amp; Tipe Kendaraan</label>
                          <input type="text" value={f.merkTipe} onChange={(e) => setF({ merkTipe: e.target.value })} placeholder="Cth: Honda Vario 150" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Nomor Plat</label>
                          <input type="text" value={f.platNomor} onChange={(e) => setF({ platNomor: e.target.value.toUpperCase() })} placeholder="Cth: R 1234 AB" className={`${inputCls} font-mono uppercase`} />
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className={labelCls}>Nama Part / Komponen yang Dibawa (Opsional)</label>
                        <input type="text" value={f.merkTipe} onChange={(e) => setF({ merkTipe: e.target.value })} placeholder="Cth: Velg NMAX, Blok Mesin, dll" className={inputCls} />
                      </div>
                    )}

                    <div className="pt-4 border-t border-surface-border">
                      <button type="button" disabled={!canGoStep2} onClick={() => setBookingStep(2)} className="w-full btn-glossy bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group">
                        Lanjut ke Layanan <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Detail Layanan */}
                {bookingStep === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div>
                      <label className={labelCls}>Pilih Layanan Utama <span className="text-red-500">*</span></label>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {LAYANAN_OPTIONS.map(l => (
                          <button
                            key={l.id} type="button"
                            onClick={() => setF({ layanan: l.id })}
                            className={`p-4 rounded-xl text-left transition-all border relative overflow-hidden group ${f.layanan === l.id ? "bg-primary/10 border-primary shadow-sm" : "bg-surface-hover/30 border-surface-border hover:bg-surface-hover/80 hover:border-surface-border/80"}`}
                          >
                            <div className="flex items-start gap-3 relative z-10">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${f.layanan === l.id ? "bg-primary text-white" : "bg-background text-muted-foreground group-hover:text-foreground"}`}>
                                <l.icon size={20} />
                              </div>
                              <div>
                                <h4 className={`text-sm font-bold mb-1 ${f.layanan === l.id ? "text-primary" : "text-foreground"}`}>{l.id}</h4>
                                <p className="text-[11px] text-muted-foreground leading-snug">{l.desc}</p>
                              </div>
                            </div>
                            {f.layanan === l.id && <div className="absolute top-3 right-3 text-primary"><CheckCircle2 size={18} /></div>}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls}>Tanggal Kedatangan</label>
                        <input type="date" min={todayStr} value={f.tanggal} onChange={(e) => setF({ tanggal: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Jam Kedatangan (Opsional)</label>
                        <select value={f.jamPreferensi} onChange={(e) => setF({ jamPreferensi: e.target.value })} className={inputCls}>
                          <option value="">Fleksibel (Kapan saja)</option>
                          {["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00"].map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Keluhan / Request Khusus (Opsional)</label>
                      <textarea value={f.keluhan} onChange={(e) => setF({ keluhan: e.target.value })} placeholder="Ceritakan masalah kendaraan Anda atau request pengerjaan khusus..." rows={3} className={`${inputCls} resize-none`} />
                    </div>

                    <div className="pt-4 border-t border-surface-border flex gap-3">
                      <button type="button" onClick={() => setBookingStep(1)} className="px-6 py-3.5 rounded-xl text-sm font-bold border border-surface-border hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground shrink-0">
                        Kembali
                      </button>
                      <button type="button" disabled={!canGoStep3} onClick={() => setBookingStep(3)} className="flex-1 btn-glossy bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group">
                        Lanjut ke Konfirmasi <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Konfirmasi */}
                {bookingStep === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="bg-surface-hover/30 rounded-2xl p-5 lg:p-6 border border-surface-border space-y-6 relative overflow-hidden">
                      {/* Watermark icon */}
                      <CarFront className="absolute -right-4 -bottom-4 text-surface-border/50 w-32 h-32 rotate-[-15deg] pointer-events-none" />
                      
                      <div>
                        <h4 className="text-sm font-bold text-primary flex items-center gap-2 mb-4 uppercase tracking-wider">
                          <CheckCircle2 size={16} /> Rincian Reservasi Anda
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Data Pelanggan</p>
                            <p className="text-sm font-medium">{f.nama}</p>
                            <p className="text-xs text-muted-foreground">{f.whatsapp}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">{isTanpaKendaraan ? "Detail Part" : "Kendaraan"}</p>
                            {isTanpaKendaraan ? (
                              <>
                                <p className="text-sm font-medium">Bawa Part Custom</p>
                                <p className="text-xs text-muted-foreground">{f.merkTipe || "Tidak ada detail part"}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium">{f.jenisKendaraan} {f.merkTipe ? `— ${f.merkTipe}` : ""}</p>
                                <p className="text-xs text-muted-foreground font-mono">{f.platNomor || "Plat belum diisi"}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-surface-border pt-4">
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Layanan Dipilih</p>
                            <p className="text-sm font-medium text-primary">{f.layanan}</p>
                            <p className="text-xs text-muted-foreground">Est. pengerjaan: {selectedLayanan?.est || "Tergantung kondisi"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Waktu Kedatangan</p>
                            <p className="text-sm font-medium">{f.tanggal ? new Date(f.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Secepatnya"}</p>
                            <p className="text-xs text-muted-foreground">{f.jamPreferensi ? `Pukul ${f.jamPreferensi}` : "Jam fleksibel"}</p>
                          </div>
                        </div>
                      </div>

                      {f.keluhan && (
                        <div className="border-t border-surface-border pt-4">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Catatan Tambahan</p>
                          <p className="text-sm text-muted-foreground italic bg-background/50 p-3 rounded-xl border border-surface-border/50">"{f.keluhan}"</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button type="button" onClick={() => setBookingStep(2)} className="px-6 py-3.5 rounded-xl text-sm font-bold border border-surface-border hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground shrink-0">
                        Ubah Data
                      </button>
                      <button type="submit" disabled={bookingStatus === "loading"} className="flex-1 btn-glossy bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                        {bookingStatus === "loading" ? <><Loader2 size={18} className="animate-spin" /> Memproses...</> : <><Calendar size={18} /> Konfirmasi &amp; Kirim Booking</>}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {/* Quick WA Booking Option */}
              <div className="bg-surface-hover/20 p-4 border-t border-surface-border text-center">
                <p className="text-xs text-muted-foreground mb-2">Atau tidak ingin repot mengisi form?</p>
                <a href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Halo MMT Racing, saya ingin booking servis / konsultasi.")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[#25D366] hover:text-[#25D366]/80 transition-colors">
                  <MessageCircle size={16} /> Booking Langsung via WhatsApp
                </a>
              </div>
            </div>
          )}
        </AnimatedSection>
      </div>
    </section>
  );
}
