"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";

const FAQ_DATA = [
  {
    q: "Berapa biaya servis rutin motor matic?",
    a: "Biaya servis rutin motor matic mulai dari Rp 40.000 – Rp 80.000 tergantung jenis servis. Sudah termasuk jasa, oli, dan pengecekan komponen penting.",
  },
  {
    q: "Apakah bisa booking online?",
    a: "Ya! Anda bisa booking langsung melalui formulir di website ini atau chat via WhatsApp. Kami akan konfirmasi jadwal dalam 15 menit pada jam kerja.",
  },
  {
    q: "Berapa lama waktu pengerjaan servis?",
    a: "Servis rutin biasanya selesai dalam 30–60 menit. Modifikasi dan bubut custom bisa 1–7 hari kerja tergantung kompleksitas pekerjaan.",
  },
  {
    q: "Apakah ada garansi setelah servis?",
    a: "Ya, semua pekerjaan kami bergaransi. Servis rutin garansi 7 hari, modifikasi garansi 30 hari, dan bubut custom garansi 14 hari.",
  },
  {
    q: "Apa saja metode pembayaran yang diterima?",
    a: "Kami menerima pembayaran tunai, transfer bank (BCA, BRI, Mandiri), dan e-wallet (GoPay, OVO, DANA, ShopeePay).",
  },
  {
    q: "Apakah melayani mobil juga?",
    a: "Ya, kami juga melayani servis dan modifikasi mobil. Silakan konsultasi terlebih dahulu via WhatsApp untuk layanan mobil.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">FAQ</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-2">Pertanyaan yang Sering Diajukan</h2>
          <p className="text-muted-foreground mt-3">Temukan jawaban untuk pertanyaan umum seputar layanan kami.</p>
        </AnimatedSection>
        <AnimatedSection>
          <div className="space-y-3">
            {FAQ_DATA.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={i} className={`glass-panel overflow-hidden transition-all duration-300 ${isOpen ? "shadow-md border-primary/20" : ""}`}>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 p-4 lg:p-5 text-left hover:bg-surface-hover/50 transition-colors"
                  >
                    <HelpCircle size={18} className={`shrink-0 transition-colors ${isOpen ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`flex-1 text-sm font-semibold ${isOpen ? "text-primary" : ""}`}>{faq.q}</span>
                    <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                    <p className="px-4 lg:px-5 pb-4 lg:pb-5 pl-11 lg:pl-12 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
