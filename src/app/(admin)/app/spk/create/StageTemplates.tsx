"use client";

import { useState, useEffect } from "react";
import { BookmarkPlus, Bookmark, Trash2, X } from "lucide-react";
import { toast } from "@/lib/toast";

export interface StageInput {
  nama: string;
  estimasiBiaya: number;
  durasiHari: number;
}

interface Template {
  id: string;
  name: string;
  mode: "modifikasi" | "bubut";
  stages: StageInput[];
  createdAt: string;
}

const STORAGE_KEY = "mm_spk_stage_templates";

function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveTemplates(list: Template[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

interface Props {
  mode: "modifikasi" | "bubut";
  currentStages: StageInput[];
  onLoad: (stages: StageInput[]) => void;
}

export function StageTemplates({ mode, currentStages, onLoad }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [showList, setShowList] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => { setTemplates(loadTemplates()); }, []);

  const filtered = templates.filter(t => t.mode === mode);

  const handleSave = () => {
    if (!newName.trim()) {
      toast.error("Nama template wajib diisi");
      return;
    }
    const validStages = currentStages.filter(s => s.nama.trim());
    if (validStages.length === 0) {
      toast.error("Tidak ada stage valid untuk disimpan");
      return;
    }
    const template: Template = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: newName.trim(),
      mode,
      stages: validStages.map(s => ({
        nama: s.nama,
        estimasiBiaya: Number(s.estimasiBiaya) || 0,
        durasiHari: Number(s.durasiHari) || 1,
      })),
      createdAt: new Date().toISOString(),
    };
    const updated = [template, ...templates];
    setTemplates(updated);
    saveTemplates(updated);
    setNewName("");
    setShowSave(false);
    toast.success("Template disimpan", `"${template.name}" dengan ${validStages.length} stage`);
  };

  const handleLoad = (t: Template) => {
    onLoad(t.stages);
    setShowList(false);
    toast.success("Template dimuat", `${t.stages.length} stage dari "${t.name}"`);
  };

  const handleDelete = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  return (
    <>
      <div className="flex gap-2">
        <button type="button" onClick={() => setShowSave(true)}
          disabled={currentStages.filter(s => s.nama.trim()).length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] border border-surface-border rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <BookmarkPlus size={12} /> Simpan Template
        </button>
        <button type="button" onClick={() => setShowList(true)}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] border border-surface-border rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Bookmark size={12} /> Muat Template ({filtered.length})
        </button>
      </div>

      {showSave && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold flex items-center gap-2"><BookmarkPlus size={16} className="text-primary" /> Simpan Template</h3>
              <button onClick={() => setShowSave(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nama Template</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder={mode === "modifikasi" ? "Contoh: Bore Up + Knalpot" : "Contoh: Bubut Klep + Liner"}
                  className="w-full mt-1 bg-surface rounded-xl px-3 py-2 text-sm border border-surface-border focus:ring-2 focus:ring-primary/50 focus:outline-none" autoFocus />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {currentStages.filter(s => s.nama.trim()).length} stage akan disimpan untuk mode <b className="capitalize">{mode}</b>.
              </p>
              <button type="button" onClick={handleSave} disabled={!newName.trim()}
                className="w-full py-2.5 bg-primary text-white font-medium rounded-xl disabled:opacity-50">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {showList && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold flex items-center gap-2"><Bookmark size={16} className="text-primary" /> Template {mode === "modifikasi" ? "Modifikasi" : "Bubut"}</h3>
              <button onClick={() => setShowList(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-3 overflow-y-auto divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-8">Belum ada template tersimpan</p>
              ) : filtered.map(t => (
                <div key={t.id} className="flex items-center gap-2 px-2 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.stages.length} stage · Total: Rp {t.stages.reduce((s, x) => s + Number(x.estimasiBiaya), 0).toLocaleString("id-ID")} · {t.stages.reduce((s, x) => s + Number(x.durasiHari), 0)} hari
                    </p>
                  </div>
                  <button type="button" onClick={() => handleLoad(t)}
                    className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90">
                    Muat
                  </button>
                  <button type="button" onClick={() => handleDelete(t.id)}
                    className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-500/10 flex items-center justify-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
