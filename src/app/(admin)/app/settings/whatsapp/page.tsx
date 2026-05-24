"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, QrCode, Send, RefreshCw, MessageSquare, CheckCircle, Clock, XCircle, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

const DEFAULT_TEMPLATES = [
  // 1. SPK Dibuat
  { event: "SPK Dibuat", mode: "repair", template: "Halo Kak *{nama}*, terima kasih telah mempercayakan servis *{kendaraan}* di MMT Racing! 🔧\n\nSPK Anda (*{no_spk}*) telah diterbitkan. Mekanik kami akan melakukan perbaikan agar kendaraan Anda kembali prima. Estimasi selesai: *{estimasi}*.", active: true },
  { event: "SPK Dibuat", mode: "modifikasi", template: "Welcome to the custom lab, Kak *{nama}*! 🏎️✨\n\nProyek *{judul_proyek}* untuk *{kendaraan}* (*{no_spk}*) telah resmi dimulai. \nSesuai kesepakatan, *Minimum DP* untuk proyek ini adalah *{minimum_dp}* dengan total estimasi tagihan *{total}*.\n\nTim kami sedang meracik rancangan terbaik. Estimasi selesai: *{estimasi}*.", active: true },
  { event: "SPK Dibuat", mode: "bubut", template: "Halo Kak *{nama}*, pesanan jasa Bubut/Milling (*{judul_proyek}*) Anda (*{no_spk}*) telah diterbitkan! 🔩📐\n\nSpesialis mesin kami akan memproses komponen/parts Anda dengan presisi tinggi sesuai spesifikasi yang diminta. Kami akan kabari jika sudah siap.\nEstimasi selesai: *{estimasi}*.", active: true },
  
  // 2. Progress Update
  { event: "Progress Update", mode: "repair", template: "Update servis *{kendaraan}* Kakak! 🛠️ Progress pengerjaan saat ini sudah mencapai *{progress}%*. Kami sedang fokus pada tahap _{stage}_. Sabar sebentar lagi ya! 🚀", active: true },
  { event: "Progress Update", mode: "modifikasi", template: "Custom Lab Update! 🔥 Desain modifikasi *{judul_proyek}* untuk *{kendaraan}* Kak *{nama}* kini telah menyentuh progress *{progress}%*. Tim spesialis kami sedang merampungkan tahap _{stage}_ dengan perhitungan presisi. We are making it perfect for you! ✨", active: true },
  { event: "Progress Update", mode: "bubut", template: "Update jasa Bubut/Milling *{judul_proyek}*! ⚙️ Progress pengerjaan part untuk *{kendaraan}* saat ini sudah mencapai *{progress}%* di tahap _{stage}_. Stay tuned! 📐", active: true },

  // 3. Selesai & Siap Ambil / Tagihan
  { event: "Selesai & Siap Ambil", mode: "all", template: "Beep beep! 🚘💨 Kabar gembira Kak *{nama}*!\n\nPengerjaan proyek *{judul_proyek}* untuk *{kendaraan}* Anda (*{no_spk}*) *SUDAH SELESAI*! 💯✨\n\n💰 *Total Tagihan:* {total}\n\nSilakan datang ke bengkel. Kami tunggu kedatangannya ya! 🤝", active: true },

  // 4. Reminder Pembayaran 
  { event: "Reminder Pembayaran", mode: "repair", template: "Halo Kak *{nama}*, mengingatkan kembali terkait pengerjaan *{kendaraan}*. Terdapat sisa tagihan *{sisa}* (Inv: {invoice}). Mohon segera dilakukan pelunasan. Terima kasih! 🙏", active: true },
  { event: "Reminder Pembayaran", mode: "modifikasi", template: "Halo Kak *{nama}* 👋\n\nUntuk melanjutkan proyek *{judul_proyek}* *{kendaraan}* (*{no_spk}*), mohon bantuannya membayarkan sisa dana termin/pelunasan (atau DP) sebesar *{sisa}*.\n\nDana cair amat menentukan *lead-time* pengerjaan! Ditunggu konfirmasinya Kak! 🤝", active: true },

  // 5. Kendala
  { event: "SPK Kendala", mode: "all", template: "Mohon maaf Kak *{nama}*, proses pengerjaan proyek *{judul_proyek}* *{kendaraan}* (*{no_spk}*) sedang mengalami kendala teknis (cth: ketersediaan sparepart / kendala mesin). \nTim kami akan segera menghubungi Anda untuk mendiskusikan langkah selanjutnya. Mohon kesediaannya menunggu 🙏", active: true },

  // 6. Gate Pass
  { event: "Lunas & Gate Pass", mode: "all", template: "Terima kasih Kak *{nama}*! 🙏 Pembayaran atas invoice *{invoice}* telah LUNAS.\n\nKunci *{kendaraan}* sudah siap diserahterimakan (Gate-Pass) 🔑.\nSebagai apresiasi, Anda mendapat *{poin} Poin Loyalty* 🪙 yang bisa ditukar nanti!\n\n(Catatan: Masa Garansi perbaikan ini aktif s/d: *{batas_garansi}*)", active: true },

  // 7. Dibatalkan
  { event: "SPK Dibatalkan", mode: "all", template: "Halo Kak *{nama}*, Pengerjaan proyek *{judul_proyek}* SPK *{no_spk}* Anda resmi DIBATALKAN. \nJika Anda memiliki pertanyaan lebih lanjut, silakan balas pesan ini. Terima kasih! 🛠️", active: true },
];

export default function WhatsAppSettingsPage() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  
  // WA Gateway State
  const [waStatus, setWaStatus] = useState<'disconnected' | 'qr' | 'connecting' | 'connected'>('disconnected');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Testing State
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Poll status every 3 seconds
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await api.get<{ status: any, qr: string }>('/whatsapp/status');
        const status = res.data?.status || 'disconnected';
        setWaStatus(status);
        setQrCodeData(res.data?.qr || null);
        
        // Auto-close QR Modal when connected
        if (status === 'connected') {
          setShowQrModal(false);
        }
      } catch (e) {
        // ignore
      }
    };
    pollStatus();
    const iv = setInterval(pollStatus, 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get<{ whatsapp?: Record<string, string> }>("/settings/config")
      .then((res) => {
        if (res.data?.whatsapp?.templates) {
          try {
            setTemplates(JSON.parse(res.data.whatsapp.templates));
          } catch (e) {
            console.error("Failed to parse WhatsApp templates");
          }
        }
      })
      .catch(() => toast.error("Gagal memuat pengaturan WhatsApp"))
      .finally(() => setLoading(false));
  }, []);

  const toggleTemplate = (idx: number) => {
    setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, active: !t.active } : t));
  };

  const handleSaveTemplates = async () => {
    setSaving(true);
    try {
      await api.put("/settings/whatsapp", { templates: JSON.stringify(templates) });
      setEditIdx(null);
      toast.success("Disimpan", "Template WhatsApp berhasil disimpan ke server");
    } catch (e) {
      toast.error("Gagal menyimpan", "Koneksi ke server bermasalah");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/whatsapp/logout", {});
      toast.success("Logout", "Sesi WhatsApp berhasil dihapus");
    } catch {}
  };

  const handleRetry = async () => {
    try {
      await api.post("/whatsapp/retry", {});
      toast.success("Memproses", "Mencoba menyambungkan ulang gateway...");
    } catch {}
  };

  const handleTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !testMessage) return;
    setSendingTest(true);
    try {
      await api.post("/whatsapp/test", { phone: testPhone, message: testMessage });
      toast.success("Berhasil", "Pesan uji coba berhasil dikirim");
      setTestMessage("");
    } catch (e: any) {
      toast.error("Gagal", e.response?.data?.message || "Gagal mengirim pesan uji coba");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Gateway</h1>
        <p className="text-muted-foreground text-sm">Konfigurasi koneksi dan template pesan notifikasi WhatsApp.</p>
      </div>

      {/* Connection Status */}
      <div className={`glass-panel p-5 border flex items-start gap-3 ${waStatus === 'connected' ? 'border-emerald-500/20 bg-emerald-500/5' : waStatus === 'connecting' ? 'border-blue-500/20 bg-blue-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
        {waStatus === 'connected' ? <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" /> : waStatus === 'connecting' ? <RefreshCw size={18} className="text-blue-500 mt-0.5 shrink-0 animate-spin" /> : <WifiOff size={18} className="text-amber-500 mt-0.5 shrink-0" />}
        <div>
          <p className={`text-sm font-semibold ${waStatus === 'connected' ? 'text-emerald-700 dark:text-emerald-400' : waStatus === 'connecting' ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
            Koneksi WhatsApp Gateway: {waStatus.toUpperCase()}
          </p>
          <p className={`text-xs mt-1 ${waStatus === 'connected' ? 'text-emerald-700/80 dark:text-emerald-400/80' : waStatus === 'connecting' ? 'text-blue-700/80 dark:text-blue-400/80' : 'text-amber-700/80 dark:text-amber-400/80'}`}>
            {waStatus === 'connected' ? 'Gateway siap dipakai untuk mengirim pesan.' : waStatus === 'connecting' ? 'Sedang menghubungkan ke WhatsApp...' : waStatus === 'qr' ? 'Silakan scan QR code untuk menghubungkan perangkat Anda.' : 'Gateway tidak terhubung. Silakan hubungkan ulang atau mulai ulang mesin API Anda.'}
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleRetry} className="flex items-center gap-1.5 text-xs bg-surface border border-surface-border px-3 py-1.5 rounded-lg hover:bg-surface-hover font-medium">
              <RefreshCw size={12} /> Reconnect
            </button>
            {waStatus === 'qr' && (
               <button onClick={() => setShowQrModal(true)} className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 font-medium">
                 <QrCode size={12} /> Scan QR
               </button>
            )}
            {waStatus === 'connected' && (
               <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 font-medium">
                 <XCircle size={12} /> Logout Dev
               </button>
            )}
          </div>
        </div>
      </div>

      {waStatus === 'connected' && (
        <div className="glass-panel p-5 animate-in fade-in duration-500">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Send size={16} className="text-primary"/> Uji Coba Kirim Pesan</h3>
          <form onSubmit={handleTestMessage} className="grid sm:grid-cols-3 gap-3">
            <input 
              type="text" 
              placeholder="No. HP (ex: 62812...)" 
              value={testPhone} 
              onChange={e => setTestPhone(e.target.value.replace(/\D/g, ''))}
              className="px-3 py-2 bg-surface text-sm border border-surface-border rounded-xl focus:outline-none focus:border-primary"
              required
            />
            <input 
              type="text" 
              placeholder="Pesan..." 
              value={testMessage} 
              onChange={e => setTestMessage(e.target.value)}
              className="px-3 py-2 bg-surface text-sm border border-surface-border rounded-xl focus:outline-none focus:border-primary"
              required
            />
            <button disabled={sendingTest || !testPhone || !testMessage} type="submit" className="flex items-center justify-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark disabled:opacity-50">
              {sendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sendingTest ? "Mengirim..." : "Kirim Uji Coba"}
            </button>
          </form>
        </div>
      )}

      {/* Template Messages */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <MessageSquare size={16} /> Template Pesan
          </h3>
          <button
            onClick={handleSaveTemplates}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs btn-glossy bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow-glossy-primary disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Simpan Template
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 hide-scrollbar">
          {[
            { id: "all", label: "General" },
            { id: "repair", label: "Service" },
            { id: "modifikasi", label: "Modif" },
            { id: "bubut", label: "Bubut" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-glossy-primary" : "bg-surface-hover text-muted-foreground hover:bg-surface-border"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
          ) : templates.map((t, originalIndex) => {
            if ((t.mode || 'all') !== activeTab) return null;
            return (
            <div key={originalIndex} className={`p-4 rounded-xl border transition-colors ${t.active ? "border-surface-border" : "border-surface-border opacity-50"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold flex items-center gap-2">
                    {t.event}
                    {/* @ts-ignore */}
                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider">{t.mode || 'all'}</span>
                  </span>
                  <button
                    onClick={() => toggleTemplate(originalIndex)}
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${t.active ? "text-emerald-600 bg-emerald-500/10" : "text-muted-foreground bg-surface-hover"}`}
                  >
                    {t.active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
                <button onClick={() => setEditIdx(editIdx === originalIndex ? null : originalIndex)} className="text-xs text-primary hover:underline font-medium">
                  {editIdx === originalIndex ? "Selesai" : "Edit"}
                </button>
              </div>
              {editIdx === originalIndex ? (
                <textarea
                  value={t.template}
                  onChange={e => setTemplates(prev => prev.map((tmpl, idx) => idx === originalIndex ? { ...tmpl, template: e.target.value } : tmpl))}
                  className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] leading-relaxed"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-surface p-2.5 rounded-lg border border-surface-border font-mono leading-relaxed whitespace-pre-wrap">
                  {t.template}
                </p>
              )}
            </div>
          )})}
        </div>
      </div>

      {/* Variable Reference */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold mb-3">📌 Variabel Template</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["{nama}", "{kendaraan}", "{no_spk}", "{judul_proyek}", "{estimasi}", "{progress}", "{stage}", "{total}", "{sisa}", "{invoice}", "{minimum_dp}", "{poin}", "{batas_garansi}"].map(v => (
            <code key={v} className="text-xs bg-surface-hover border border-surface-border rounded-lg px-2 py-1 font-mono text-primary text-center">{v}</code>
          ))}
        </div>
      </div>

      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 shadow-xl">
             <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
               <h3 className="font-bold flex items-center gap-2"><QrCode size={16} className="text-primary" /> Scan QR Server</h3>
               <button onClick={() => setShowQrModal(false)} className="text-muted-foreground hover:text-foreground"><XCircle size={18} /></button>
             </div>
             <div className="p-6 flex flex-col items-center">
                {qrCodeData ? (
                  <img src={qrCodeData} alt="WhatsApp QR" className="w-64 h-64 object-contain rounded-xl" />
                ) : (
                  <div className="w-64 h-64 flex bg-surface-hover items-center justify-center rounded-xl">
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Buka WhatsApp di HP Anda, buka menu Tautkan Perangkat (Linked Devices), lalu arahkan kamera ke kode QR ini.
                </p>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
