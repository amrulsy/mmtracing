"use client";

import { Wrench, Cog, Hammer, Shield, Clock, Users, Star, Eye, Award, Zap, Target } from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";
import type { LandingData } from "../types";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Wrench, Cog, Hammer, Shield, Clock, Users, Star, Eye, Award, Zap, Target,
};

interface ServicesSectionProps {
  services: LandingData["landing_services"];
}

export default function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <section id="layanan" className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Layanan Kami</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">Solusi Lengkap untuk Kendaraan Anda</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Dari perawatan rutin hingga modifikasi presisi tinggi — semua dikerjakan di satu tempat.</p>
        </AnimatedSection>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {services.map((svc, i) => {
            const IconComp = ICON_MAP[svc.icon] || Wrench;
            return (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="group glass-panel p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${svc.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <IconComp size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{svc.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{svc.desc}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
