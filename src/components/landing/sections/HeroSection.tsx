"use client";

import { Calendar, MessageCircle, Zap, ChevronDown, Star, Users, Award, Shield } from "lucide-react";
import type { LandingData, ContactData, QueueData } from "../types";

interface HeroSectionProps {
  hero: LandingData["landing_hero"];
  contact: ContactData;
  queueData: QueueData | null;
  stats?: LandingData["landing_stats"];
}

export default function HeroSection({ hero, contact, queueData, stats }: HeroSectionProps) {
  const titleParts = hero.title.split(/(Modifikasi)/);

  // Build trust badges from real stats data
  const trustBadges = [
    { icon: Star, text: stats?.[3]?.value ? `${stats[3].value} Rating` : "4.9 Rating", color: "text-amber-500" },
    { icon: Users, text: stats?.[1]?.value ? `${stats[1].value} Pelanggan` : "5200+ Pelanggan", color: "text-blue-500" },
    { icon: Award, text: stats?.[0]?.value ? `${stats[0].value} Tahun` : "10+ Tahun", color: "text-emerald-500" },
    { icon: Shield, text: "Garansi Resmi", color: "text-purple-500" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/15" />

      {/* Floating gradient orbs */}
      <div className="hero-orb-1 absolute top-[10%] right-[15%] w-80 h-80 lg:w-[600px] lg:h-[600px] bg-primary/20 dark:bg-primary/30 rounded-full blur-[80px] lg:blur-[120px]" />
      <div className="hero-orb-2 absolute bottom-[15%] left-[5%] w-72 h-72 lg:w-[450px] lg:h-[450px] bg-primary/15 dark:bg-primary/25 rounded-full blur-[60px] lg:blur-[100px]" />
      <div className="hidden lg:block hero-orb-3 absolute top-[45%] left-[55%] w-56 h-56 lg:w-80 lg:h-80 bg-blue-500/10 dark:bg-blue-400/20 rounded-full blur-[60px]" />

      {/* Center glow pulse */}
      <div className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] lg:w-[700px] lg:h-[700px] bg-primary/10 dark:bg-primary/20 rounded-full blur-[100px]" />

      {/* Rotating geometric ring — desktop only */}
      <div className="hidden lg:block hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] lg:w-[800px] lg:h-[800px] opacity-[0.12] dark:opacity-[0.18]">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/50" />
        <div className="absolute inset-8 rounded-full border border-primary/30" />
        <div className="absolute inset-20 rounded-full border border-dashed border-primary/20" />
      </div>

      {/* Animated dot grid — desktop only */}
      <div className="hidden lg:block hero-grid absolute inset-0 opacity-[0.06] dark:opacity-[0.10]" style={{ backgroundImage: "radial-gradient(circle, currentColor 1.2px, transparent 1.2px)", backgroundSize: "36px 36px" }} />

      {/* Floating particles — reduced to 5 for better perf */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block">
        <div className="hero-particle-1 absolute top-[25%] left-[12%] w-3 h-3 bg-primary/60 dark:bg-primary/80 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
        <div className="hero-particle-2 absolute top-[55%] right-[18%] w-2 h-2 bg-primary/50 dark:bg-primary/70 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.3)]" />
        <div className="hero-particle-3 absolute top-[40%] left-[38%] w-1.5 h-1.5 bg-foreground/30 dark:bg-foreground/50 rounded-full" />
        <div className="hero-particle-4 absolute top-[20%] right-[30%] w-3.5 h-3.5 bg-primary/35 dark:bg-primary/55 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
        <div className="hero-particle-5 absolute bottom-[30%] left-[50%] w-2 h-2 bg-blue-500/40 dark:bg-blue-400/60 rounded-full shadow-[0_0_6px_rgba(59,130,246,0.3)]" />
      </div>

      {/* Soft edge vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,var(--background)_90%)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-32">
        {/* Tagline badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 animate-in fade-in duration-700">
          <Zap size={12} /> {hero.tagline}
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {titleParts.map((part, i) =>
            part === "Modifikasi" ? (
              <span key={i} className="text-primary">{part}</span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </h1>

        {/* Subtitle */}
        <p className="text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          {hero.subtitle}
        </p>

        {/* Trust badges — NEW */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          {trustBadges.map((badge, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <badge.icon size={14} className={badge.color} />
              <span className="font-semibold">{badge.text}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <a href="#booking" className="w-full sm:w-auto btn-glossy bg-primary text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2">
            <Calendar size={18} /> Booking Online
          </a>
          <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors">
            <MessageCircle size={18} /> Chat WhatsApp
          </a>
        </div>

        {/* Live queue badge */}
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-hover border border-surface-border text-xs animate-in fade-in duration-700 delay-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          {queueData && queueData.total > 0 ? (
            <span className="text-muted-foreground">
              <b className="text-foreground">{queueData.dikerjakan}</b> sedang dikerjakan · <b className="text-foreground">{queueData.antri}</b> antri
            </span>
          ) : (
            <span className="text-muted-foreground">Bengkel siap melayani — tidak ada antrian</span>
          )}
          <a href="#antrian" className="text-primary font-medium hover:underline">Lihat →</a>
        </div>

        {/* Scroll indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground animate-in fade-in duration-700 delay-500">
          <ChevronDown size={20} className="animate-bounce" />
          <span className="text-xs">Scroll untuk eksplorasi</span>
        </div>
      </div>
    </section>
  );
}
