"use client";

import { useState } from "react";
import { Bell, Save, Smartphone, Mail, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

interface Channel {
  id: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  enabled: boolean;
}

interface NotifEvent {
  name: string;
  app: boolean;
  wa: boolean;
  email: boolean;
}

export default function NotifikasiSettingsPage() {
  const [saving, setSaving] = useState(false);

  const [channels, setChannels] = useState<Channel[]>([
    { id: "app", icon: Bell, label: "Push Notifikasi (App)", desc: "Notifikasi di dalam aplikasi", enabled: true },
    { id: "wa", icon: MessageSquare, label: "WhatsApp", desc: "Kirim notifikasi via WA Gateway", enabled: true },
    { id: "email", icon: Mail, label: "Email", desc: "Kirim email ke admin/SA", enabled: false },
    { id: "sms", icon: Smartphone, label: "SMS", desc: "SMS untuk notifikasi kritis", enabled: false },
  ]);

  const [events, setEvents] = useState<NotifEvent[]>([
    { name: "SPK Baru Dibuat", app: true, wa: true, email: false },
    { name: "Pembayaran Diterima", app: true, wa: true, email: true },
    { name: "Stok Menipis", app: true, wa: false, email: false },
    { name: "Kendala Pengerjaan", app: true, wa: true, email: false },
    { name: "SPK Selesai", app: true, wa: true, email: false },
    { name: "Garansi Hampir Expired", app: true, wa: false, email: false },
    { name: "Reminder Pelunasan", app: true, wa: true, email: true },
    { name: "Booking Baru", app: true, wa: true, email: false },
  ]);

  const toggleChannel = (id: string) => {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, enabled: !ch.enabled } : ch));
  };

  const toggleEvent = (idx: number, field: "app" | "wa" | "email") => {
    setEvents(prev => prev.map((ev, i) => i === idx ? { ...ev, [field]: !ev[field] } : ev));
  };

  const handleSave = async () => {
    setSaving(true);
    // Persist to localStorage (no backend endpoint for notifications config yet)
    localStorage.setItem("mm_notifikasi", JSON.stringify({ channels, events }));
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    toast.success("Disimpan", "Pengaturan notifikasi berhasil disimpan");
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Bell className="text-primary" size={24} /> Pengaturan Notifikasi</h1>
        <p className="text-muted-foreground text-sm">Atur channel dan event notifikasi.</p>
      </div>

      {/* Channels */}
      <div className="glass-panel p-4 lg:p-6">
        <h3 className="font-bold text-sm mb-4">📡 Channel Notifikasi</h3>
        <div className="space-y-3">
          {channels.map((ch) => (
            <div key={ch.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-border">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ch.enabled ? "bg-primary/10 text-primary" : "bg-surface-hover text-muted-foreground"}`}>
                  <ch.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium">{ch.label}</p>
                  <p className="text-[10px] text-muted-foreground">{ch.desc}</p>
                </div>
              </div>
              <button
                onClick={() => toggleChannel(ch.id)}
                className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${ch.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${ch.enabled ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Event Matrix */}
      <div className="glass-panel p-4 lg:p-6">
        <h3 className="font-bold text-sm mb-4">📋 Event Notifikasi</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
            <span className="flex-1 text-[10px] font-bold uppercase text-muted-foreground">Event</span>
            <span className="w-12 text-center text-[10px] font-bold uppercase text-muted-foreground">App</span>
            <span className="w-12 text-center text-[10px] font-bold uppercase text-muted-foreground">WA</span>
            <span className="w-12 text-center text-[10px] font-bold uppercase text-muted-foreground">Email</span>
          </div>
          {events.map((ev, i) => (
            <div key={i} className="flex items-center gap-2 py-2 border-b border-surface-border/50">
              <span className="flex-1 text-xs font-medium">{ev.name}</span>
              {(["app", "wa", "email"] as const).map((field) => (
                <div key={field} className="w-12 flex justify-center">
                  <button
                    onClick={() => toggleEvent(i, field)}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${ev[field] ? "bg-primary text-white" : "bg-surface-hover border border-surface-border"}`}
                  >
                    {ev[field] && <span className="text-[10px]">✓</span>}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-glossy-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>
    </div>
  );
}
