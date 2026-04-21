"use client";

import { useState } from "react";
import { Wifi, WifiOff, QrCode, Send, RefreshCw, MessageSquare, CheckCircle, Clock, XCircle, Save, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

const DEFAULT_TEMPLATES = [
  { event: "SPK Dibuat", template: "Halo {nama}, kendaraan {kendaraan} Anda sedang dalam proses pengerjaan. No. SPK: {no_spk}. Estimasi selesai: {estimasi}. Terima kasih! 🔧", active: true },
  { event: "Progress Update", template: "Update progress {kendaraan}: {progress}% selesai. Stage saat ini: {stage}. Kami akan kabari lagi! 📊", active: true },
  { event: "Selesai & Siap Ambil", template: "Kabar baik! Kendaraan {kendaraan} sudah selesai dan siap diambil. Total biaya: {total}. Ditunggu ya, {nama}! ✅", active: true },
  { event: "Reminder Pembayaran", template: "Reminder: Sisa tagihan {sisa} untuk {kendaraan} (Invoice {invoice}). Mohon segera dilunasi. Terima kasih! 💰", active: true },
  { event: "Reminder Servis Berkala", template: "Halo {nama}! Sudah waktunya servis berkala untuk {kendaraan} Anda. Yuk booking di MM Tracing! 🛠️", active: false },
];

export default function WhatsAppSettingsPage() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleTemplate = (idx: number) => {
    setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, active: !t.active } : t));
  };

  const handleSaveTemplates = async () => {
    setSaving(true);
    localStorage.setItem("mm_wa_templates", JSON.stringify(templates));
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    setEditIdx(null);
    toast.success("Disimpan", "Template WhatsApp berhasil disimpan");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Gateway</h1>
        <p className="text-muted-foreground text-sm">Konfigurasi koneksi dan template pesan notifikasi WhatsApp.</p>
      </div>

      {/* Connection Status — no real backend WA status API, show info banner */}
      <div className="glass-panel p-5 border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
        <WifiOff size={18} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Koneksi WhatsApp Gateway</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
            Status koneksi real-time tersedia setelah WA Gateway dikonfigurasi di server. Hubungi administrator untuk setup Baileys / WA API.
          </p>
          <div className="flex gap-2 mt-3">
            <button className="flex items-center gap-1.5 text-xs bg-surface border border-surface-border px-3 py-1.5 rounded-lg hover:bg-surface-hover font-medium">
              <RefreshCw size={12} /> Cek Status
            </button>
            <button className="flex items-center gap-1.5 text-xs bg-surface border border-surface-border px-3 py-1.5 rounded-lg hover:bg-surface-hover font-medium">
              <QrCode size={12} /> Scan QR
            </button>
          </div>
        </div>
      </div>

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
        <div className="space-y-3">
          {templates.map((t, i) => (
            <div key={i} className={`p-4 rounded-xl border transition-colors ${t.active ? "border-surface-border" : "border-surface-border opacity-50"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{t.event}</span>
                  <button
                    onClick={() => toggleTemplate(i)}
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${t.active ? "text-emerald-600 bg-emerald-500/10" : "text-muted-foreground bg-surface-hover"}`}
                  >
                    {t.active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
                <button onClick={() => setEditIdx(editIdx === i ? null : i)} className="text-xs text-primary hover:underline font-medium">
                  {editIdx === i ? "Selesai" : "Edit"}
                </button>
              </div>
              {editIdx === i ? (
                <textarea
                  value={t.template}
                  onChange={e => setTemplates(prev => prev.map((tmpl, idx) => idx === i ? { ...tmpl, template: e.target.value } : tmpl))}
                  className="w-full bg-surface border border-surface-border rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] leading-relaxed"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-surface p-2.5 rounded-lg border border-surface-border font-mono leading-relaxed">
                  {t.template}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Variable Reference */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold mb-3">📌 Variabel Template</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["{nama}", "{kendaraan}", "{no_spk}", "{estimasi}", "{progress}", "{stage}", "{total}", "{sisa}", "{invoice}"].map(v => (
            <code key={v} className="text-xs bg-surface-hover border border-surface-border rounded-lg px-2 py-1 font-mono text-primary text-center">{v}</code>
          ))}
        </div>
      </div>
    </div>
  );
}
