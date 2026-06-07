"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, Plus, Package, Wrench, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

// Types
interface Jasa {
  id: number;
  kode: string;
  name: string;
  kategori?: string | null;
  harga: number;
  hargaModal?: number;
  estimasiWaktu?: string | null;
  garansiHari?: number | null;
  sparepartBundles?: Array<{
    id: number;
    qtyDefault: number;
    sparepart: {
      id: number;
      name: string;
      hargaJual: number;
      stok: number;
      kode?: string;
      merk?: string;
    };
  }>;
}

interface Sparepart {
  id: number;
  kode: string;
  name: string;
  merk?: string | null;
  kategori?: { id: number; name: string } | null;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
  satuan: string;
  lokasi?: string | null;
}

interface SearchResult {
  jasa: Jasa[];
  sparepart: Sparepart[];
}

interface SelectedItem {
  type: 'jasa' | 'sparepart';
  id: number;
  nama: string;
  harga: number;
  qty: number;
  // For jasa
  jasaId?: number;
  // For sparepart
  sparepartId?: number;
  stok?: number;
  // Auto-added bundles
  bundles?: Array<{
    sparepartId: number;
    nama: string;
    harga: number;
    qty: number;
    stok: number;
  }>;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (items: SelectedItem[]) => void;
  selectedItems: SelectedItem[];
  mode?: 'jasa' | 'sparepart' | 'both';
}

// Format rupiah
const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

export function CommandPalette({
  isOpen,
  onClose,
  onSelect,
  selectedItems,
  mode = 'both'
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({ jasa: [], sparepart: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localSelected, setLocalSelected] = useState<SelectedItem[]>(selectedItems);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults({ jasa: [], sparepart: [] });
      setSelectedIndex(0);
      setLocalSelected(selectedItems);
      inputRef.current?.focus();
    }
  }, [isOpen, selectedItems]);

  // Search API call with debounce
  useEffect(() => {
    if (!isOpen || query.length < 2) {
      setResults({ jasa: [], sparepart: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [jasaRes, sparepartRes] = await Promise.all([
          mode !== 'sparepart' 
            ? api.getPaginated<Jasa>("/jasa", { limit: 20, search: query })
            : Promise.resolve({ data: [] }),
          mode !== 'jasa'
            ? api.getPaginated<Sparepart>("/sparepart", { limit: 20, search: query })
            : Promise.resolve({ data: [] }),
        ]);
        
        setResults({
          jasa: jasaRes.data,
          sparepart: sparepartRes.data,
        });
        setSelectedIndex(0);
      } catch {
        toast.error("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen, mode]);

  // Flatten results for keyboard navigation
  const flatResults = [
    ...results.jasa.map(j => ({ type: 'jasa' as const, item: j })),
    ...results.sparepart.map(s => ({ type: 'sparepart' as const, item: s })),
  ];

  const totalResults = flatResults.length;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalResults);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalResults) % totalResults);
    } else if (e.key === 'Enter' && totalResults > 0) {
      e.preventDefault();
      const selected = flatResults[selectedIndex];
      if (selected) {
        handleSelect(selected.type, selected.item);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [totalResults, selectedIndex, flatResults, onClose]);

  // Add item to selection
  const handleSelect = (type: 'jasa' | 'sparepart', item: Jasa | Sparepart) => {
    const isJasa = type === 'jasa';
    const id = isJasa ? (item as Jasa).id : (item as Sparepart).id;
    const existingIndex = localSelected.findIndex(
      x => x.type === type && (isJasa ? x.jasaId === id : x.sparepartId === id)
    );

    if (existingIndex >= 0) {
      // Increase qty if already selected
      const newSelected = [...localSelected];
      newSelected[existingIndex].qty += 1;
      setLocalSelected(newSelected);
    } else {
      // Add new item
      const newItem: SelectedItem = isJasa
        ? {
            type: 'jasa',
            id,
            jasaId: id,
            nama: (item as Jasa).name,
            harga: Number((item as Jasa).harga),
            qty: 1,
            bundles: (item as Jasa).sparepartBundles?.map(b => ({
              sparepartId: b.sparepart.id,
              nama: b.sparepart.name,
              harga: Number(b.sparepart.hargaJual),
              qty: b.qtyDefault,
              stok: b.sparepart.stok,
            })),
          }
        : {
            type: 'sparepart',
            id,
            sparepartId: id,
            nama: (item as Sparepart).name,
            harga: Number((item as Sparepart).hargaJual),
            qty: 1,
            stok: (item as Sparepart).stok,
          };

      // Auto-add bundles for jasa
      const withBundles = [...localSelected, newItem];
      if (isJasa && newItem.bundles) {
        newItem.bundles.forEach(bundle => {
          const existingBundle = withBundles.find(
            x => x.type === 'sparepart' && x.sparepartId === bundle.sparepartId
          );
          if (existingBundle) {
            existingBundle.qty += bundle.qty;
          } else {
            withBundles.push({
              type: 'sparepart',
              id: bundle.sparepartId,
              sparepartId: bundle.sparepartId,
              nama: bundle.nama,
              harga: bundle.harga,
              qty: bundle.qty,
              stok: bundle.stok,
            });
          }
        });
        toast.success("Bundel Paket Aktif", `${newItem.bundles.length} sparepart otomatis ditambahkan`);
      }

      setLocalSelected(withBundles);
    }

    // Keep search open for multiple selection
    setQuery("");
    inputRef.current?.focus();
  };

  // Remove from selection
  const handleRemove = (index: number) => {
    setLocalSelected(prev => prev.filter((_, i) => i !== index));
  };

  // Update qty
  const updateQty = (index: number, delta: number) => {
    setLocalSelected(prev => {
      const newItems = [...prev];
      const newQty = newItems[index].qty + delta;
      if (newQty < 1) {
        return prev.filter((_, i) => i !== index);
      }
      newItems[index].qty = newQty;
      return newItems;
    });
  };

  // Confirm selection
  const handleConfirm = () => {
    onSelect(localSelected);
    onClose();
  };

  // Scroll selected into view
  useEffect(() => {
    const element = listRef.current?.children[selectedIndex] as HTMLElement;
    element?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const totalJasa = localSelected.filter(x => x.type === 'jasa').reduce((s, x) => s + x.harga * x.qty, 0);
  const totalSparepart = localSelected.filter(x => x.type === 'sparepart').reduce((s, x) => s + x.harga * x.qty, 0);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl mx-4 bg-background rounded-2xl shadow-2xl border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-border">
          <Search size={20} className="text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'both' ? "Cari jasa atau sparepart..." : mode === 'jasa' ? "Cari jasa servis..." : "Cari sparepart..."}
            className="flex-1 bg-transparent border-none focus:outline-none text-lg placeholder:text-muted-foreground/50"
          />
          {loading && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover rounded-lg text-muted-foreground"
          >
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-surface-hover rounded text-xs font-mono">ESC</kbd>
            <X size={18} className="sm:hidden" />
          </button>
        </div>

        <div className="flex max-h-[60vh]">
          {/* Results List */}
          <div className="flex-1 overflow-y-auto">
            {query.length < 2 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Ketik minimal 2 karakter untuk mencari</p>
                {localSelected.length > 0 && (
                  <p className="text-xs mt-2 opacity-70">{localSelected.length} item sudah dipilih</p>
                )}
              </div>
            ) : loading ? (
              <div className="p-8 text-center">
                <Loader2 size={24} className="animate-spin mx-auto text-primary" />
              </div>
            ) : totalResults === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Tidak ada hasil untuk "{query}"</p>
              </div>
            ) : (
              <div ref={listRef} className="py-2">
                {/* Jasa Section */}
                {results.jasa.length > 0 && mode !== 'sparepart' && (
                  <div className="mb-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench size={12} /> Jasa Servis ({results.jasa.length})
                    </div>
                    {results.jasa.map((jasa, idx) => {
                      const globalIdx = idx;
                      const isSelected = localSelected.some(x => x.type === 'jasa' && x.jasaId === jasa.id);
                      const isActive = selectedIndex === globalIdx;
                      
                      return (
                        <button
                          key={jasa.id}
                          onClick={() => handleSelect('jasa', jasa)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors ${
                            isActive ? 'bg-primary/10' : 'hover:bg-surface-hover/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isSelected && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                              <span className="font-medium text-sm truncate">{jasa.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              {jasa.kode && <span className="uppercase">{jasa.kode}</span>}
                              {jasa.kategori && <span>· {jasa.kategori}</span>}
                              {jasa.garansiHari && <span className="text-green-600">· Garansi {jasa.garansiHari} hari</span>}
                              {jasa.sparepartBundles && jasa.sparepartBundles.length > 0 && (
                                <span className="text-amber-600">· +{jasa.sparepartBundles.length} item bundle</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <span className="font-bold text-sm text-primary">{formatRp(jasa.harga)}</span>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-primary text-white' : 'bg-surface-hover'
                            }`}>
                              {isSelected ? <Plus size={14} /> : <Plus size={14} className="text-muted-foreground" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Sparepart Section */}
                {results.sparepart.length > 0 && mode !== 'jasa' && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={12} /> Sparepart & Material ({results.sparepart.length})
                    </div>
                    {results.sparepart.map((sp, idx) => {
                      const globalIdx = results.jasa.length + idx;
                      const isSelected = localSelected.some(x => x.type === 'sparepart' && x.sparepartId === sp.id);
                      const isActive = selectedIndex === globalIdx;
                      const lowStock = sp.stok < sp.stokMinimum;
                      const outOfStock = sp.stok === 0;
                      
                      return (
                        <button
                          key={sp.id}
                          onClick={() => !outOfStock && handleSelect('sparepart', sp)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          disabled={outOfStock}
                          className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors ${
                            isActive ? 'bg-primary/10' : 'hover:bg-surface-hover/50'
                          } ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isSelected && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                              <span className="font-medium text-sm truncate">{sp.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              {sp.kode && <span className="uppercase">{sp.kode}</span>}
                              {sp.merk && <span>· {sp.merk}</span>}
                              <span>· Stok: {sp.stok} {sp.satuan}</span>
                              {outOfStock && <span className="text-red-500 font-bold">· HABIS</span>}
                              {lowStock && !outOfStock && <span className="text-amber-500">· Menipis</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <span className="font-bold text-sm text-primary">{formatRp(sp.hargaJual)}</span>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-primary text-white' : outOfStock ? 'bg-surface-hover/50' : 'bg-surface-hover'
                            }`}>
                              {isSelected ? <Plus size={14} /> : <Plus size={14} className={outOfStock ? 'text-muted-foreground/30' : 'text-muted-foreground'} />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Items Sidebar */}
          {localSelected.length > 0 && (
            <div className="w-64 border-l border-surface-border bg-surface/30 overflow-y-auto">
              <div className="p-3 border-b border-surface-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Item Terpilih ({localSelected.length})</p>
              </div>
              <div className="p-2 space-y-1">
                {localSelected.map((item, idx) => (
                  <div key={`${item.type}-${item.id}-${idx}`} className="bg-background border border-surface-border rounded-lg p-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {item.type === 'jasa' ? <Wrench size={10} className="text-primary" /> : <Package size={10} className="text-blue-500" />}
                          <span className="text-xs font-medium truncate">{item.nama}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{formatRp(item.harga)} × {item.qty}</p>
                      </div>
                      <button 
                        onClick={() => handleRemove(idx)}
                        className="p-1 hover:bg-red-500/10 text-red-500 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <button 
                        onClick={() => updateQty(idx, -1)}
                        className="w-5 h-5 rounded border border-surface-border text-xs flex items-center justify-center hover:bg-surface-hover"
                      >−</button>
                      <span className="text-xs font-bold w-6 text-center">{item.qty}</span>
                      <button 
                        onClick={() => updateQty(idx, 1)}
                        className="w-5 h-5 rounded border border-surface-border text-xs flex items-center justify-center hover:bg-surface-hover"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Totals */}
              <div className="p-3 border-t border-surface-border mt-auto">
                {totalJasa > 0 && (
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Jasa</span>
                    <span className="font-medium">{formatRp(totalJasa)}</span>
                  </div>
                )}
                {totalSparepart > 0 && (
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Sparepart</span>
                    <span className="font-medium">{formatRp(totalSparepart)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-surface-border pt-2">
                  <span>Total</span>
                  <span className="text-primary">{formatRp(totalJasa + totalSparepart)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border-t border-surface-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-hover rounded text-[10px]">↑↓</kbd>
              <span>Navigasi</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-hover rounded text-[10px]">↵</kbd>
              <span>Pilih</span>
            </span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={localSelected.length === 0}
            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Konfirmasi ({localSelected.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export type { SelectedItem, Jasa, Sparepart };
