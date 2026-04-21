"use client";

import { useState, useEffect } from "react";
import { Palette, Save, Sun, Moon, Monitor, Check } from "lucide-react";
import { toast } from "@/lib/toast";

type ThemeMode = "light" | "dark" | "system";
type AccentColor = "red" | "blue" | "purple" | "green" | "orange" | "pink";

const ACCENT_COLORS: { name: string; value: AccentColor; hex: string }[] = [
  { name: "Merah", value: "red", hex: "#dc2626" },
  { name: "Biru", value: "blue", hex: "#2563eb" },
  { name: "Ungu", value: "purple", hex: "#7c3aed" },
  { name: "Hijau", value: "green", hex: "#059669" },
  { name: "Orange", value: "orange", hex: "#ea580c" },
  { name: "Pink", value: "pink", hex: "#db2777" },
];

export default function TampilanPage() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [accentColor, setAccentColor] = useState<AccentColor>("red");
  const [fontSize, setFontSize] = useState(14);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mm_tampilan");
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.themeMode) setThemeMode(prefs.themeMode);
        if (prefs.accentColor) setAccentColor(prefs.accentColor);
        if (prefs.fontSize) setFontSize(prefs.fontSize);
      } catch { /* ignore */ }
    }
  }, []);

  const handleSave = () => {
    const prefs = { themeMode, accentColor, fontSize };
    localStorage.setItem("mm_tampilan", JSON.stringify(prefs));

    // Apply theme to HTML element
    const html = document.documentElement;
    if (themeMode === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else if (themeMode === "light") {
      html.classList.remove("dark");
      html.classList.add("light");
    } else {
      html.classList.remove("dark", "light");
    }

    // Apply font size
    html.style.fontSize = `${fontSize}px`;

    toast.success("Disimpan", "Preferensi tampilan berhasil diterapkan");
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Palette className="text-primary" size={24} /> Tampilan</h1>
        <p className="text-muted-foreground text-sm">Sesuaikan tema, warna, dan preferensi tampilan.</p>
      </div>

      {/* Theme Mode */}
      <div className="glass-panel p-4 lg:p-6">
        <h3 className="font-bold text-sm mb-4">🎨 Mode Tema</h3>
        <div className="grid grid-cols-3 gap-3">
          {([
            { icon: Sun, label: "Light", desc: "Tema terang", value: "light" as const },
            { icon: Moon, label: "Dark", desc: "Tema gelap", value: "dark" as const },
            { icon: Monitor, label: "Sistem", desc: "Sesuai perangkat", value: "system" as const },
          ]).map((t) => (
            <button
              key={t.value}
              onClick={() => setThemeMode(t.value)}
              className={`p-3 lg:p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${themeMode === t.value ? "border-primary bg-primary/5 shadow-glossy-primary" : "border-surface-border hover:border-primary/30"}`}
            >
              <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 ${themeMode === t.value ? "bg-primary text-white" : "bg-surface-hover text-muted-foreground"}`}>
                <t.icon size={20} />
              </div>
              <p className="text-sm font-bold">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="glass-panel p-4 lg:p-6">
        <h3 className="font-bold text-sm mb-4">🎯 Warna Aksen</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setAccentColor(c.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${accentColor === c.value ? "border-primary shadow-sm" : "border-transparent hover:border-surface-border"}`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm" style={{ background: c.hex }}>
                {accentColor === c.value && <Check size={16} className="text-white" />}
              </div>
              <p className="text-[10px] font-medium">{c.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="glass-panel p-4 lg:p-6">
        <h3 className="font-bold text-sm mb-4">📏 Ukuran Font</h3>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground font-bold">A</span>
          <input
            type="range" min="12" max="18" value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="flex-1 accent-primary h-2 rounded-full"
          />
          <span className="text-lg text-muted-foreground font-bold">A</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Ukuran: <span className="font-bold text-foreground">{fontSize}px</span> &nbsp;·&nbsp; Preview: <span className="font-medium text-foreground" style={{ fontSize: `${fontSize}px` }}>Ini contoh teks dengan ukuran saat ini.</span>
        </p>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-glossy-primary">
          <Save size={16} /> Simpan &amp; Terapkan
        </button>
      </div>
    </div>
  );
}
