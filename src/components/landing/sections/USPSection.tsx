"use client";

import { Wrench, Cog, Hammer, Shield, Clock, Users, Star, Eye, Award, Zap, Target } from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";
import type { LandingData } from "../types";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Wrench, Cog, Hammer, Shield, Clock, Users, Star, Eye, Award, Zap, Target,
};

interface USPSectionProps {
  usps: LandingData["landing_usp"];
}

export default function USPSection({ usps }: USPSectionProps) {
  const colors = [
    "text-emerald-500 bg-emerald-500/10",
    "text-blue-500 bg-blue-500/10",
    "text-amber-500 bg-amber-500/10",
    "text-purple-500 bg-purple-500/10",
  ];

  return (
    <section className="py-16 lg:py-24 bg-surface-hover/30">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Kenapa MMT Racing?</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">Pilihan Tepat untuk Kendaraan Anda</h2>
        </AnimatedSection>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {usps.map((usp, i) => {
            const IconComp = ICON_MAP[usp.icon] || Shield;
            return (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="glass-panel p-5 text-center hover:shadow-md transition-shadow h-full">
                  <div className={`w-14 h-14 rounded-2xl ${colors[i % 4]} flex items-center justify-center mx-auto mb-3`}>
                    <IconComp size={24} />
                  </div>
                  <h4 className="font-bold mb-1">{usp.title}</h4>
                  <p className="text-xs text-muted-foreground">{usp.desc}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
