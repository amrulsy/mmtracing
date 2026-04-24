"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";

interface SearchResults {
  pelanggan: { id: number; name: string; phone: string }[];
  kendaraan: { id: number; name: string; plat: string; pelanggan: { name: string } }[];
  spk: { id: number; noSpk: string; status: string; pelanggan: { name: string }; kendaraan: { plat: string } | null }[];
}

const STATUS_COLORS: Record<string, string> = {
  antri: "bg-yellow-500/20 text-yellow-400",
  dikerjakan: "bg-blue-500/20 text-blue-400",
  selesai: "bg-green-500/20 text-green-400",
  kendala: "bg-red-500/20 text-red-400",
  dibatalkan: "bg-neutral-500/20 text-neutral-400",
};

export function GlobalSearch({ className = "", isMobile = false }: { className?: string; isMobile?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<SearchResults>("/search", { q: q.trim() });
      setResults(res.data);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(path);
  };

  const clearSearch = () => {
    setQuery("");
    setResults(null);
    setOpen(false);
  };

  const hasResults = results && (results.pelanggan.length > 0 || results.kendaraan.length > 0 || results.spk.length > 0);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className={`flex items-center gap-2 bg-surface-hover border border-surface-border focus-within:ring-1 focus-within:ring-primary transition-all ${isMobile ? "px-3 py-2 rounded-xl w-full" : "px-3 py-1.5 rounded-full"}`}>
        {loading ? (
          <Loader2 size={isMobile ? 16 : 18} className="text-muted-foreground animate-spin" />
        ) : (
          <Search size={isMobile ? 16 : 18} className="text-muted-foreground" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
          placeholder="Cari pelanggan, no polisi, SPK..."
          className={`bg-transparent border-none focus:outline-none text-sm ${isMobile ? "w-full" : "w-64"}`}
        />
        {query && (
          <button onClick={clearSearch} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results && (
        <div className={`absolute z-50 mt-2 border border-surface-border rounded-xl shadow-2xl overflow-hidden glass ${isMobile ? "left-0 right-0" : "left-0 w-[420px]"}`}
             style={{ backdropFilter: "blur(20px)" }}>
          <div className="max-h-[70vh] overflow-y-auto">
            {!hasResults && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Tidak ada hasil untuk &quot;{query}&quot;
              </div>
            )}

            {/* Pelanggan */}
            {results.pelanggan.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-surface-hover/50 flex items-center gap-1.5">
                  <span>👤</span> Pelanggan
                  <span className="ml-auto text-[10px] bg-surface-border rounded-full px-1.5 py-0.5">{results.pelanggan.length}</span>
                </div>
                {results.pelanggan.map((p) => (
                  <button
                    key={`p-${p.id}`}
                    onClick={() => navigate(`/app/kendaraan?pelanggan=${p.id}`)}
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-hover transition-colors flex items-center gap-3 border-b border-surface-border/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-400 text-sm font-medium shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.phone}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Kendaraan */}
            {results.kendaraan.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-surface-hover/50 flex items-center gap-1.5">
                  <span>🚗</span> Kendaraan
                  <span className="ml-auto text-[10px] bg-surface-border rounded-full px-1.5 py-0.5">{results.kendaraan.length}</span>
                </div>
                {results.kendaraan.map((k) => (
                  <button
                    key={`k-${k.id}`}
                    onClick={() => navigate(`/app/kendaraan/${k.id}`)}
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-hover transition-colors flex items-center gap-3 border-b border-surface-border/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-sm shrink-0">
                      🚗
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{k.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-mono">{k.plat}</span>
                        <span className="text-surface-border">•</span>
                        <span>{k.pelanggan.name}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* SPK */}
            {results.spk.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-surface-hover/50 flex items-center gap-1.5">
                  <span>📋</span> SPK
                  <span className="ml-auto text-[10px] bg-surface-border rounded-full px-1.5 py-0.5">{results.spk.length}</span>
                </div>
                {results.spk.map((s) => (
                  <button
                    key={`s-${s.id}`}
                    onClick={() => navigate(`/app/spk/${s.id}`)}
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-hover transition-colors flex items-center gap-3 border-b border-surface-border/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center text-violet-400 text-sm shrink-0">
                      📋
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium font-mono">{s.noSpk}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] || "bg-neutral-500/20 text-neutral-400"}`}>
                          {s.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{s.pelanggan.name}</span>
                        {s.kendaraan && (
                          <>
                            <span className="text-surface-border">•</span>
                            <span className="font-mono">{s.kendaraan.plat}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
