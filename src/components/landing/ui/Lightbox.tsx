"use client";

import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxProps {
  images: { src: string; title: string; sub: string }[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ images, currentIndex, isOpen, onClose, onNavigate }: LightboxProps) {
  const goPrev = useCallback(() => onNavigate(Math.max(0, currentIndex - 1)), [currentIndex, onNavigate]);
  const goNext = useCallback(() => onNavigate(Math.min(images.length - 1, currentIndex + 1)), [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, goPrev, goNext, onClose]);

  if (!isOpen || !images.length) return null;

  const current = images[currentIndex];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative max-w-5xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button onClick={onClose} className="absolute -top-12 right-0 text-white/70 hover:text-white p-2 transition-colors" aria-label="Tutup">
          <X size={24} />
        </button>

        {/* Image */}
        <div className="relative rounded-xl overflow-hidden bg-black/50">
          <img
            src={current.src}
            alt={current.title}
            className="w-full h-auto max-h-[75vh] object-contain mx-auto"
          />
        </div>

        {/* Caption */}
        <div className="text-center mt-4 text-white">
          <p className="font-bold">{current.title}</p>
          <p className="text-sm text-white/60">{current.sub}</p>
          <p className="text-xs text-white/40 mt-1">{currentIndex + 1} / {images.length}</p>
        </div>

        {/* Nav arrows */}
        {currentIndex > 0 && (
          <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-3 rounded-full transition-colors" aria-label="Sebelumnya">
            <ChevronLeft size={24} />
          </button>
        )}
        {currentIndex < images.length - 1 && (
          <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-3 rounded-full transition-colors" aria-label="Selanjutnya">
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
