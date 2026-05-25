"use client";

import { useRef } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";
import type { TestimonialItem } from "../types";

interface TestimonialsSectionProps {
  testimonials: TestimonialItem[];
}

export default function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section id="testimoni" className="py-16 lg:py-24 bg-surface-hover/30">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Testimoni</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">Apa Kata Pelanggan Kami</h2>
        </AnimatedSection>

        {/* Desktop: Grid / Mobile: Horizontal scroll carousel */}
        <div className="relative">
          {/* Scroll buttons — desktop */}
          <button onClick={() => scroll("left")} className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/80 backdrop-blur-sm border border-surface-border rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors shadow-sm" aria-label="Scroll kiri">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => scroll("right")} className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/80 backdrop-blur-sm border border-surface-border rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors shadow-sm" aria-label="Scroll kanan">
            <ChevronRight size={18} />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4 lg:mx-0 lg:px-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {testimonials.map((t, i) => (
              <AnimatedSection key={i} delay={i * 100} className="min-w-[280px] sm:min-w-[300px] lg:min-w-[320px] snap-start flex-shrink-0">
                <div className="glass-panel p-5 h-full flex flex-col">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: t.rating }, (_, j) => (
                      <Star key={j} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">&quot;{t.text}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-sm font-bold border border-primary/10">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
