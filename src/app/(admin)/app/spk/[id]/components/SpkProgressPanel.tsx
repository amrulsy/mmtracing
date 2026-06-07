"use client";

import { CheckCircle2, Loader2, Save } from "lucide-react";

interface SpkProgressPanelProps {
  status: string;
  progress: number;
  originalProgress?: number | null;
  hasChecklist: boolean;
  onChangeProgress: (v: number) => void;
  onOpenChecklist: () => void;
  onSave: () => void;
  saving: boolean;
}

export function SpkProgressPanel({
  status,
  progress,
  originalProgress,
  hasChecklist,
  onChangeProgress,
  onOpenChecklist,
  onSave,
  saving,
}: SpkProgressPanelProps) {
  const canShow = status === "dikerjakan" || status === "kendala";
  if (!canShow) return null;

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Update Progress</h3>
        {hasChecklist && (
          <button
            onClick={onOpenChecklist}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <CheckCircle2 size={13} /> Checklist Pekerjaan
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0} max={100} step={5}
          value={progress}
          onChange={e => onChangeProgress(Number(e.target.value))}
          className="flex-1 accent-primary"
          aria-label="Progress manual"
        />
        <span className="text-sm font-bold w-12 text-right">{progress}%</span>
        <button
          onClick={onSave}
          disabled={saving || progress === (originalProgress ?? progress)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Simpan
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">Tip: progres dihitung otomatis dari checklist. Slider hanya digunakan jika tidak ada item/tahap.</p>
    </div>
  );
}
