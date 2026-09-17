"use client";

import { Wrench, Cog, Hammer, ArrowUpRight } from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";
import type { LandingData } from "../types";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = { Wrench, Cog, Hammer };

export default function ServicesSection({ services }: { services: LandingData["landing_services"] }) {
  const motor = services.filter((service) => !/bubut|cnc|shaft|spacer|adapter|bracket/i.test(`${service.title} ${service.desc}`));
  const bubut = services.filter((service) => /bubut|cnc|shaft|spacer|adapter|bracket/i.test(`${service.title} ${service.desc}`));
  const groups = [
    { title: "Bengkel motor", kicker: "RAWAT MESIN. SIAPKAN PERJALANAN.", description: "Perawatan, perbaikan, dan modifikasi motor sesuai kebutuhan Anda.", icon: Wrench, services: motor },
    { title: "Jasa bubut custom", kicker: "DARI KEBUTUHAN MENJADI KOMPONEN.", description: "Konsultasikan ukuran, material, dan fungsi komponen sebelum pengerjaan.", icon: Hammer, services: bubut },
  ].filter((group) => group.services.length);
  return <section id="layanan" className="py-16 lg:py-24"><div className="max-w-7xl mx-auto px-4 lg:px-8">
    <AnimatedSection className="text-center mb-12"><span className="text-xs font-bold uppercase tracking-widest text-primary">Layanan Kami</span><h2 className="text-3xl lg:text-4xl font-black mt-2">Satu bengkel, dua fokus pengerjaan</h2><p className="text-muted-foreground mt-3 max-w-xl mx-auto">Pilih kebutuhan motor atau komponen Anda, lalu mulai dengan konsultasi yang jelas.</p></AnimatedSection>
    <div className="grid lg:grid-cols-2 gap-5 lg:gap-7">{groups.map((group, index) => <AnimatedSection key={group.title} delay={index * 100}><article className="service-focus-card"><div className="flex items-start justify-between gap-4"><group.icon className="text-primary" size={32} strokeWidth={1.5}/><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span></div><p className="service-kicker">{group.kicker}</p><h3>{group.title}</h3><p className="service-intro">{group.description}</p><div className="service-detail-list">{group.services.map((service) => { const Icon = ICON_MAP[service.icon] || Cog; return <details key={service.title}><summary><span><Icon size={16}/>{service.title}</span><ArrowUpRight size={17}/></summary><p>{service.desc}</p></details>; })}</div><a href="#booking" className="service-focus-link">Diskusikan kebutuhan Anda <ArrowUpRight size={18}/></a></article></AnimatedSection>)}</div>
  </div></section>;
}
