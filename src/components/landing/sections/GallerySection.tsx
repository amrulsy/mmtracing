"use client";

import { useMemo, useState } from "react";
import AnimatedSection from "../ui/AnimatedSection";
import GalleryImage from "../ui/GalleryImage";
import Lightbox from "../ui/Lightbox";
import type { GalleryItem } from "../types";

const categoryOf = (item: GalleryItem) => /bubut|cnc|shaft|spacer|adapter|bracket/i.test(`${item.title} ${item.sub}`) ? "Bubut" : "Motor";

export default function GallerySection({ gallery }: { gallery: GalleryItem[] }) {
  const [filter, setFilter] = useState("Semua");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = useMemo(() => gallery.filter((item) => item.image), [gallery]);
  const categories = ["Semua", ...Array.from(new Set(images.map(categoryOf)))];
  const filtered = images.filter((item) => filter === "Semua" || categoryOf(item) === filter);
  return <section id="galeri" className="py-16 lg:py-24"><div className="max-w-7xl mx-auto px-4 lg:px-8">
    <AnimatedSection className="text-center mb-8"><span className="text-xs font-bold uppercase tracking-widest text-primary">Galeri</span><h2 className="text-3xl lg:text-4xl font-black mt-2">Hasil kerja yang bisa dilihat dekat</h2><p className="text-muted-foreground mt-3 max-w-xl mx-auto">Pilih foto untuk melihat detail pengerjaan.</p></AnimatedSection>
    {categories.length > 2 && <div className="gallery-filter" aria-label="Filter galeri">{categories.map((category) => <button key={category} type="button" aria-pressed={category === filter} onClick={() => setFilter(category)}>{category}</button>)}</div>}
    <div className="gallery-grid">{filtered.map((item, index) => <AnimatedSection key={`${item.image}-${index}`} delay={index * 70}><button type="button" className="gallery-tile" onClick={() => setLightboxIndex(index)} aria-label={`Lihat foto ${item.title}`}><span className="gallery-image"><GalleryImage src={item.image} alt={item.title}/><i aria-hidden="true">↗</i></span><span className="gallery-copy"><strong>{item.title}</strong><small>{item.sub}</small></span></button></AnimatedSection>)}</div>
    <Lightbox images={filtered.map((item) => ({ src: item.image!, title: item.title, sub: item.sub }))} currentIndex={lightboxIndex ?? 0} isOpen={lightboxIndex !== null} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex}/>
  </div></section>;
}
