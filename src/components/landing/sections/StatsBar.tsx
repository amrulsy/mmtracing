"use client";

import { Award, Users, Target, Star } from "lucide-react";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import { useCounter, parseStatValue } from "../hooks/useCounter";
import type { LandingData } from "../types";

interface StatsBarProps {
  stats?: LandingData["landing_stats"];
}

export default function StatsBar({ stats }: StatsBarProps) {
  const statsAnim = useScrollAnimation();

  const stat0 = parseStatValue(stats?.[0]?.value || "10+");
  const stat1 = parseStatValue(stats?.[1]?.value || "5200+");
  const stat2 = parseStatValue(stats?.[2]?.value || "15800+");
  const stat3 = parseStatValue(stats?.[3]?.value || "4.9");

  const c0 = useCounter(stat0.num, statsAnim.isVisible);
  const c1 = useCounter(stat1.num, statsAnim.isVisible);
  const c2 = useCounter(stat2.num, statsAnim.isVisible);
  const c3 = useCounter(Math.round(stat3.num * 10), statsAnim.isVisible);

  const counters = [
    { value: `${c0}${stat0.suffix}`, label: stats?.[0]?.label || "Tahun Pengalaman", icon: Award },
    { value: `${c1.toLocaleString()}${stat1.suffix}`, label: stats?.[1]?.label || "Pelanggan Puas", icon: Users },
    { value: `${c2.toLocaleString()}${stat2.suffix}`, label: stats?.[2]?.label || "SPK Selesai", icon: Target },
    { value: `${(c3 / 10).toFixed(1)}${stat3.suffix}`, label: stats?.[3]?.label || "Rating Google", icon: Star },
  ];

  return (
    <section ref={statsAnim.ref} className="relative py-16 lg:py-20 bg-gradient-to-r from-primary to-primary/80">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {counters.map((s, i) => (
            <div
              key={i}
              className={`text-center text-white transition-all duration-700 ${statsAnim.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <s.icon size={28} className="mx-auto mb-2 opacity-60" />
              <p className="text-3xl lg:text-4xl font-black">{s.value}</p>
              <p className="text-xs lg:text-sm opacity-80 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
