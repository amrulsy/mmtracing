"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "@/lib/toast";
import Link from "next/link";

interface LandingContent {
  landing_hero: { tagline: string; title: string; subtitle: string };
  landing_stats: { value: string; label: string }[];
  landing_services: { icon: string; title: string; desc: string; color: string; image?: string }[];
  landing_usp: { icon: string; title: string; desc: string }[];
  landing_pricing_motor: { name: string; price: string; note: string; popular: boolean }[];
  landing_pricing_mobil: { name: string; price: string; note: string; popular: boolean }[];
  landing_pricing_bubut: { name: string; price: string; note: string; popular: boolean }[];
  landing_testimonials: { name: string; role: string; text: string; rating: number; avatar?: string }[];
  landing_contact: { address: string; addressDetail: string; hours: string; hoursClosed: string; phone: string; email: string; whatsapp: string; mapsEmbed?: string };
  landing_footer: { description: string; hourWeekday: string; hourSaturday: string; hourSunday: string };
  landing_gallery: { title: string; sub: string; image?: string }[];
}

const ICON_OPTIONS = ["Wrench", "Cog", "Hammer", "Shield", "Clock", "Users", "Star", "Eye", "Award", "Zap", "Target"];
const COLOR_OPTIONS = [
  { label: "Blue", value: "from-blue-500 to-blue-600" },
  { label: "Red", value: "from-red-500 to-red-600" },
  { label: "Purple", value: "from-purple-500 to-purple-600" },
  { label: "Emerald", value: "from-emerald-500 to-emerald-600" },
  { label: "Amber", value: "from-amber-500 to-amber-600" },
  { label: "Cyan", value: "from-cyan-500 to-cyan-600" },
];

const inputClass = "w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";
const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

export default function LandingSettingsPage() {
  const [data, setData] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    api.get<LandingContent>("/landing/content")
      .then(res => setData(res.data))
      .catch(() => toast.error("Gagal", "Gagal memuat konten landing"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await api.put("/landing/content", data);
      toast.success("Berhasil", "Konten landing berhasil disimpan");
    } catch {
      toast.error("Gagal", "Gagal menyimpan konten landing");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  const sections = [
    { id: "hero", label: "🏠 Hero" },
    { id: "stats", label: "📊 Statistik" },
    { id: "services", label: "🔧 Layanan" },
    { id: "usp", label: "⚡ Keunggulan" },
    { id: "pricing", label: "💰 Harga" },
    { id: "testimonials", label: "⭐ Testimoni" },
    { id: "gallery", label: "🖼️ Galeri" },
    { id: "contact", label: "📞 Kontak" },
    { id: "footer", label: "📋 Footer" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Editor Landing Page</h2>
          <p className="text-xs text-muted-foreground">Edit konten halaman depan website bengkel.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" target="_blank" className="flex items-center gap-1.5 text-xs text-muted-foreground border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover transition-colors">
            <ExternalLink size={14} /> Preview
          </Link>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 btn-glossy bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Simpan
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeSection === s.id ? "bg-primary text-white" : "bg-surface-hover text-muted-foreground hover:text-foreground"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ========== HERO ========== */}
      {activeSection === "hero" && (
        <div className="glass-panel p-4 lg:p-6 space-y-4">
          <h3 className="font-bold text-sm">Hero Section</h3>
          <div className="space-y-3">
            <div><label className={labelClass}>Tagline</label><input className={inputClass} value={data.landing_hero.tagline} onChange={e => setData({ ...data, landing_hero: { ...data.landing_hero, tagline: e.target.value } })} /></div>
            <div><label className={labelClass}>Judul Utama</label><input className={inputClass} value={data.landing_hero.title} onChange={e => setData({ ...data, landing_hero: { ...data.landing_hero, title: e.target.value } })} /></div>
            <div><label className={labelClass}>Subtitle</label><textarea className={inputClass} rows={3} value={data.landing_hero.subtitle} onChange={e => setData({ ...data, landing_hero: { ...data.landing_hero, subtitle: e.target.value } })} /></div>
          </div>
        </div>
      )}

      {/* ========== STATS ========== */}
      {activeSection === "stats" && (
        <div className="glass-panel p-4 lg:p-6 space-y-4">
          <h3 className="font-bold text-sm">Statistik</h3>
          <div className="space-y-3">
            {data.landing_stats.map((s, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1"><label className={labelClass}>Nilai</label><input className={inputClass} value={s.value} onChange={e => { const n = [...data.landing_stats]; n[i] = { ...n[i], value: e.target.value }; setData({ ...data, landing_stats: n }); }} /></div>
                <div className="flex-1"><label className={labelClass}>Label</label><input className={inputClass} value={s.label} onChange={e => { const n = [...data.landing_stats]; n[i] = { ...n[i], label: e.target.value }; setData({ ...data, landing_stats: n }); }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== SERVICES ========== */}
      {activeSection === "services" && (
        <div className="glass-panel p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Layanan</h3>
            <button onClick={() => setData({ ...data, landing_services: [...data.landing_services, { icon: "Wrench", title: "", desc: "", color: "from-blue-500 to-blue-600", image: "" }] })} className="flex items-center gap-1 text-xs text-primary font-medium"><Plus size={14} /> Tambah</button>
          </div>
          <div className="space-y-4">
            {data.landing_services.map((svc, i) => (
              <div key={i} className="p-3 border border-surface-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Layanan #{i + 1}</span>
                  <button onClick={() => { const n = data.landing_services.filter((_, j) => j !== i); setData({ ...data, landing_services: n }); }} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelClass}>Icon</label><select className={inputClass} value={svc.icon} onChange={e => { const n = [...data.landing_services]; n[i] = { ...n[i], icon: e.target.value }; setData({ ...data, landing_services: n }); }}>{ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}</select></div>
                  <div><label className={labelClass}>Warna</label><select className={inputClass} value={svc.color} onChange={e => { const n = [...data.landing_services]; n[i] = { ...n[i], color: e.target.value }; setData({ ...data, landing_services: n }); }}>{COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                </div>
                <div><label className={labelClass}>Judul</label><input className={inputClass} value={svc.title} onChange={e => { const n = [...data.landing_services]; n[i] = { ...n[i], title: e.target.value }; setData({ ...data, landing_services: n }); }} /></div>
                <div><label className={labelClass}>Deskripsi</label><textarea className={inputClass} rows={2} value={svc.desc} onChange={e => { const n = [...data.landing_services]; n[i] = { ...n[i], desc: e.target.value }; setData({ ...data, landing_services: n }); }} /></div>
                <div><label className={labelClass}>Gambar URL (opsional)</label><div className="flex gap-2 items-center"><input className={inputClass} value={svc.image || ''} placeholder="https://example.com/image.jpg" onChange={e => { const n = [...data.landing_services]; n[i] = { ...n[i], image: e.target.value }; setData({ ...data, landing_services: n }); }} />{svc.image && <img src={svc.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-surface-border shrink-0" />}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== USP ========== */}
      {activeSection === "usp" && (
        <div className="glass-panel p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Keunggulan</h3>
            <button onClick={() => setData({ ...data, landing_usp: [...data.landing_usp, { icon: "Shield", title: "", desc: "" }] })} className="flex items-center gap-1 text-xs text-primary font-medium"><Plus size={14} /> Tambah</button>
          </div>
          <div className="space-y-3">
            {data.landing_usp.map((u, i) => (
              <div key={i} className="p-3 border border-surface-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  <button onClick={() => { const n = data.landing_usp.filter((_, j) => j !== i); setData({ ...data, landing_usp: n }); }} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelClass}>Icon</label><select className={inputClass} value={u.icon} onChange={e => { const n = [...data.landing_usp]; n[i] = { ...n[i], icon: e.target.value }; setData({ ...data, landing_usp: n }); }}>{ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}</select></div>
                  <div><label className={labelClass}>Judul</label><input className={inputClass} value={u.title} onChange={e => { const n = [...data.landing_usp]; n[i] = { ...n[i], title: e.target.value }; setData({ ...data, landing_usp: n }); }} /></div>
                </div>
                <div><label className={labelClass}>Deskripsi</label><input className={inputClass} value={u.desc} onChange={e => { const n = [...data.landing_usp]; n[i] = { ...n[i], desc: e.target.value }; setData({ ...data, landing_usp: n }); }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== PRICING ========== */}
      {activeSection === "pricing" && (
        <div className="space-y-4">
          {(["motor", "mobil", "bubut"] as const).map(type => {
            const key = `landing_pricing_${type}` as keyof LandingContent;
            const items = data[key] as { name: string; price: string; note: string; popular: boolean }[];
            return (
              <div key={type} className="glass-panel p-4 lg:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm capitalize">Harga {type}</h3>
                  <button onClick={() => setData({ ...data, [key]: [...items, { name: "", price: "", note: "", popular: false }] })} className="flex items-center gap-1 text-xs text-primary font-medium"><Plus size={14} /> Tambah</button>
                </div>
                {items.map((p, i) => (
                  <div key={i} className="flex gap-2 items-end p-2 border border-surface-border rounded-lg">
                    <div className="flex-1"><label className={labelClass}>Nama</label><input className={inputClass} value={p.name} onChange={e => { const n = [...items]; n[i] = { ...n[i], name: e.target.value }; setData({ ...data, [key]: n }); }} /></div>
                    <div className="w-32"><label className={labelClass}>Harga</label><input className={inputClass} value={p.price} onChange={e => { const n = [...items]; n[i] = { ...n[i], price: e.target.value }; setData({ ...data, [key]: n }); }} /></div>
                    <div className="flex-1"><label className={labelClass}>Catatan</label><input className={inputClass} value={p.note} onChange={e => { const n = [...items]; n[i] = { ...n[i], note: e.target.value }; setData({ ...data, [key]: n }); }} /></div>
                    <label className="flex items-center gap-1 text-xs pb-2 cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={p.popular} onChange={e => { const n = [...items]; n[i] = { ...n[i], popular: e.target.checked }; setData({ ...data, [key]: n }); }} className="rounded" /> Pop
                    </label>
                    <button onClick={() => { const n = items.filter((_, j) => j !== i); setData({ ...data, [key]: n }); }} className="text-red-500 hover:text-red-400 pb-2"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ========== TESTIMONIALS ========== */}
      {activeSection === "testimonials" && (
        <div className="glass-panel p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Testimoni</h3>
            <button onClick={() => setData({ ...data, landing_testimonials: [...data.landing_testimonials, { name: "", role: "", text: "", rating: 5, avatar: "" }] })} className="flex items-center gap-1 text-xs text-primary font-medium"><Plus size={14} /> Tambah</button>
          </div>
          <div className="space-y-3">
            {data.landing_testimonials.map((t, i) => (
              <div key={i} className="p-3 border border-surface-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Testimoni #{i + 1}</span>
                  <button onClick={() => { const n = data.landing_testimonials.filter((_, j) => j !== i); setData({ ...data, landing_testimonials: n }); }} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelClass}>Nama</label><input className={inputClass} value={t.name} onChange={e => { const n = [...data.landing_testimonials]; n[i] = { ...n[i], name: e.target.value }; setData({ ...data, landing_testimonials: n }); }} /></div>
                  <div><label className={labelClass}>Role</label><input className={inputClass} value={t.role} onChange={e => { const n = [...data.landing_testimonials]; n[i] = { ...n[i], role: e.target.value }; setData({ ...data, landing_testimonials: n }); }} /></div>
                </div>
                <div><label className={labelClass}>Teks</label><textarea className={inputClass} rows={2} value={t.text} onChange={e => { const n = [...data.landing_testimonials]; n[i] = { ...n[i], text: e.target.value }; setData({ ...data, landing_testimonials: n }); }} /></div>
                <div className="w-20"><label className={labelClass}>Rating</label><input type="number" min={1} max={5} className={inputClass} value={t.rating} onChange={e => { const n = [...data.landing_testimonials]; n[i] = { ...n[i], rating: parseInt(e.target.value) || 5 }; setData({ ...data, landing_testimonials: n }); }} /></div>
                <div className="flex-1"><label className={labelClass}>Foto Avatar URL (opsional)</label><div className="flex gap-2 items-center"><input className={inputClass} value={t.avatar || ''} placeholder="https://example.com/avatar.jpg" onChange={e => { const n = [...data.landing_testimonials]; n[i] = { ...n[i], avatar: e.target.value }; setData({ ...data, landing_testimonials: n }); }} />{t.avatar && <img src={t.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-surface-border shrink-0" />}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== GALLERY ========== */}
      {activeSection === "gallery" && (
        <div className="glass-panel p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Galeri</h3>
            <button onClick={() => setData({ ...data, landing_gallery: [...data.landing_gallery, { title: "", sub: "", image: "" }] })} className="flex items-center gap-1 text-xs text-primary font-medium"><Plus size={14} /> Tambah</button>
          </div>
          <div className="space-y-2">
            {data.landing_gallery.map((g, i) => (
              <div key={i} className="p-3 border border-surface-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Galeri #{i + 1}</span>
                  <button onClick={() => { const n = data.landing_gallery.filter((_, j) => j !== i); setData({ ...data, landing_gallery: n }); }} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelClass}>Judul</label><input className={inputClass} value={g.title} onChange={e => { const n = [...data.landing_gallery]; n[i] = { ...n[i], title: e.target.value }; setData({ ...data, landing_gallery: n }); }} /></div>
                  <div><label className={labelClass}>Sub</label><input className={inputClass} value={g.sub} onChange={e => { const n = [...data.landing_gallery]; n[i] = { ...n[i], sub: e.target.value }; setData({ ...data, landing_gallery: n }); }} /></div>
                </div>
                <div><label className={labelClass}>Gambar URL</label><div className="flex gap-2 items-center"><input className={inputClass} value={g.image || ''} placeholder="https://example.com/gallery.jpg" onChange={e => { const n = [...data.landing_gallery]; n[i] = { ...n[i], image: e.target.value }; setData({ ...data, landing_gallery: n }); }} />{g.image && <img src={g.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-surface-border shrink-0" />}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== CONTACT ========== */}
      {activeSection === "contact" && (
        <div className="glass-panel p-4 lg:p-6 space-y-4">
          <h3 className="font-bold text-sm">Kontak & Lokasi</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={labelClass}>Alamat</label><input className={inputClass} value={data.landing_contact.address} onChange={e => setData({ ...data, landing_contact: { ...data.landing_contact, address: e.target.value } })} /></div>
            <div><label className={labelClass}>Detail Alamat</label><input className={inputClass} value={data.landing_contact.addressDetail} onChange={e => setData({ ...data, landing_contact: { ...data.landing_contact, addressDetail: e.target.value } })} /></div>
            <div><label className={labelClass}>Jam Operasional</label><input className={inputClass} value={data.landing_contact.hours} onChange={e => setData({ ...data, landing_contact: { ...data.landing_contact, hours: e.target.value } })} /></div>
            <div><label className={labelClass}>Hari Tutup</label><input className={inputClass} value={data.landing_contact.hoursClosed} onChange={e => setData({ ...data, landing_contact: { ...data.landing_contact, hoursClosed: e.target.value } })} /></div>
            <div><label className={labelClass}>Telepon</label><input className={inputClass} value={data.landing_contact.phone} onChange={e => setData({ ...data, landing_contact: { ...data.landing_contact, phone: e.target.value } })} /></div>
            <div><label className={labelClass}>Email</label><input className={inputClass} value={data.landing_contact.email} onChange={e => setData({ ...data, landing_contact: { ...data.landing_contact, email: e.target.value } })} /></div>
            <div className="sm:col-span-2"><label className={labelClass}>WhatsApp (tanpa +)</label><input className={inputClass} value={data.landing_contact.whatsapp} onChange={e => setData({ ...data, landing_contact: { ...data.landing_contact, whatsapp: e.target.value } })} placeholder="62812345678" /></div>
            <div className="sm:col-span-2"><label className={labelClass}>Google Maps Embed (HTML iframe)</label><textarea className={inputClass} rows={3} value={data.landing_contact.mapsEmbed || ''} onChange={e => setData({ ...data, landing_contact: { ...data.landing_contact, mapsEmbed: e.target.value } })} placeholder='<iframe src="https://www.google.com/maps/embed?..." ...></iframe>' /><p className="text-[10px] text-muted-foreground mt-1">Paste iframe embed dari Google Maps. Buka Google Maps → Share → Embed a map → copy HTML.</p></div>
          </div>
        </div>
      )}

      {/* ========== FOOTER ========== */}
      {activeSection === "footer" && (
        <div className="glass-panel p-4 lg:p-6 space-y-4">
          <h3 className="font-bold text-sm">Footer</h3>
          <div className="space-y-3">
            <div><label className={labelClass}>Deskripsi</label><textarea className={inputClass} rows={2} value={data.landing_footer.description} onChange={e => setData({ ...data, landing_footer: { ...data.landing_footer, description: e.target.value } })} /></div>
            <div className="grid sm:grid-cols-3 gap-2">
              <div><label className={labelClass}>Jam Senin-Jumat</label><input className={inputClass} value={data.landing_footer.hourWeekday} onChange={e => setData({ ...data, landing_footer: { ...data.landing_footer, hourWeekday: e.target.value } })} /></div>
              <div><label className={labelClass}>Jam Sabtu</label><input className={inputClass} value={data.landing_footer.hourSaturday} onChange={e => setData({ ...data, landing_footer: { ...data.landing_footer, hourSaturday: e.target.value } })} /></div>
              <div><label className={labelClass}>Jam Minggu</label><input className={inputClass} value={data.landing_footer.hourSunday} onChange={e => setData({ ...data, landing_footer: { ...data.landing_footer, hourSunday: e.target.value } })} /></div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save */}
      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 btn-glossy bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold shadow-glossy-primary hover:shadow-glossy-primary-dark disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Simpan Semua Perubahan
        </button>
      </div>
    </div>
  );
}
