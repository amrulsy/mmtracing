"use client";

import { ArrowDownRight, Calendar, MessageCircle } from "lucide-react";
import type { LandingData, ContactData, QueueData } from "../types";
import PrecisionVisual from "../ui/PrecisionVisual";
import { getWhatsAppUrl } from "../contact";

interface HeroSectionProps { hero: LandingData["landing_hero"]; contact: ContactData; queueData: QueueData | null; stats?: LandingData["landing_stats"]; }

export default function HeroSection({ hero, contact, queueData }: HeroSectionProps) {
  const whatsapp = getWhatsAppUrl(contact.whatsapp, "Halo, saya ingin konsultasi layanan bengkel.");
  const titleParts = hero.title.split(/(bubut|modifikasi)/i);
  return <section id="home" className="industrial-hero">
    <div className="industrial-grid" aria-hidden="true" />
    <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-28 lg:py-36 grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-center">
      <div>
        <p className="industrial-eyebrow"><span />{hero.tagline}</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.06] mb-6">
          {titleParts.map((part, index) => /^(bubut|modifikasi)$/i.test(part) ? <span key={index} className="text-primary">{part}</span> : <span key={index}>{part}</span>)}
        </h1>
        <p className="text-base lg:text-lg text-muted-foreground max-w-xl mb-8">{hero.subtitle}</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <a href={whatsapp || "#kontak"} {...(whatsapp ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="w-full sm:w-auto btn-glossy bg-primary text-white px-7 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><MessageCircle size={18}/>{whatsapp ? "Konsultasi via WhatsApp" : "Lihat informasi kontak"}</a>
          <a href="#layanan" className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm border border-surface-border hover:bg-surface-hover transition-colors">Lihat layanan <ArrowDownRight size={18}/></a>
        </div>
        <div className="hero-info-row"><span><Calendar size={14}/> Booking dengan konfirmasi bengkel</span>{queueData && <a href="#antrian"><i/>Status antrean tersedia <ArrowDownRight size={14}/></a>}</div>
      </div>
      <PrecisionVisual />
    </div>
  </section>;
}
