"use client";

import { useState, useCallback } from "react";
import AnimatedSection from "../ui/AnimatedSection";
import GalleryImage from "../ui/GalleryImage";
import Lightbox from "../ui/Lightbox";
import type { GalleryItem } from "../types";

interface GallerySectionProps {
  gallery: GalleryItem[];
}

export default function GallerySection({ gallery }: GallerySectionProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const lightboxImages = gallery
    .filter((g) => !!g.image)
    .map((g) => ({ src: g.image!, title: g.title, sub: g.sub }));

  const openLightbox = useCallback((galleryIndex: number) => {
    const item = gallery[galleryIndex];
    if (!item?.image) return;
    const lbIdx = lightboxImages.findIndex((img) => img.src === item.image);
    if (lbIdx >= 0) {
      setLightboxIndex(lbIdx);
      setLightboxOpen(true);
    }
  }, [gallery, lightboxImages]);

  return (
    <>
      <section id="galeri" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Galeri</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Hasil Kerja Kami</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Klik gambar untuk melihat lebih detail.</p>
          </AnimatedSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {gallery.map((g, i) => (
              <AnimatedSection key={i} delay={i * 80}>
                <div
                  onClick={() => openLightbox(i)}
                  className="aspect-square bg-gradient-to-br from-surface-hover to-surface relative rounded-xl overflow-hidden group cursor-pointer border border-surface-border"
                >
                  <GalleryImage src={g.image} alt={g.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <div className="text-white">
                      <p className="text-sm font-bold">{g.title}</p>
                      <p className="text-[10px] opacity-75">{g.sub}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <Lightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}
