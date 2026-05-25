"use client";

import { useState } from "react";
import AnimatedSection from "../ui/AnimatedSection";
import type { LandingData } from "../types";

interface PricingSectionProps {
  pricingMotor: LandingData["landing_pricing_motor"];
  pricingMobil: LandingData["landing_pricing_mobil"];
  pricingBubut: LandingData["landing_pricing_bubut"];
}

export default function PricingSection({ pricingMotor, pricingMobil, pricingBubut }: PricingSectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [pricingMotor, pricingMobil, pricingBubut];

  return (
    <section id="harga" className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Daftar Harga</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">Harga Transparan, Tanpa Kejutan</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Harga sudah termasuk jasa. Sparepart original.</p>
        </AnimatedSection>
        <AnimatedSection>
          <div className="flex justify-center gap-1 mb-8 bg-surface-hover rounded-xl border border-surface-border p-1 max-w-md mx-auto">
            {["Motor", "Mobil", "Bubut"].map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === i ? "bg-primary text-white shadow-glossy-primary" : "text-muted-foreground hover:bg-surface"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {(tabs[activeTab] || []).map((p, i) => (
              <div key={i} className={`glass-panel p-5 relative transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${p.popular ? "border-primary/40 shadow-glossy-primary" : ""}`}>
                {p.popular && <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">POPULER</span>}
                <h4 className="font-bold">{p.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.note}</p>
                <p className="text-xl font-black text-primary mt-2 font-mono">{p.price}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
        <p className="text-center text-xs text-muted-foreground mt-6">* Harga dapat berubah sesuai kondisi kendaraan. Konsultasi gratis via WhatsApp.</p>
      </div>
    </section>
  );
}
