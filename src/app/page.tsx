import LandingClient, { type LandingData, type QueueData } from "@/components/landing/LandingClient";

// SSR: Fetch landing data at the server level for SEO
async function fetchLandingData(): Promise<LandingData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:5000";
    const res = await fetch(`${backendUrl}/api/v1/landing/content`, {
      next: { revalidate: 60 },
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch {}
  return null;
}

async function fetchQueueData(): Promise<QueueData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:5000";
    const res = await fetch(`${backendUrl}/api/v1/landing/queue`, {
      next: { revalidate: 15 },
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch {}
  return null;
}

// JSON-LD: LocalBusiness (AutoRepair)
function BusinessJsonLd({ data }: { data: LandingData | null }) {
  const contact = data?.landing_contact;
  const header = data?.landing_header;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: header?.brandName || "MMT Racing",
    description: data?.landing_hero?.subtitle || "Spesialis servis rutin, modifikasi, dan jasa bubut custom untuk motor di Cilacap.",
    url: "https://mmtracing.com",
    telephone: contact?.phone || "",
    email: contact?.email || "",
    address: {
      "@type": "PostalAddress",
      streetAddress: contact?.address || "Widarapayung Wetan, Binangun",
      addressLocality: "Cilacap",
      addressRegion: "Jawa Tengah",
      addressCountry: "ID",
    },
    openingHours: ["Mo-Fr 08:00-17:00", "Sa 08:00-15:00"],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "520",
    },
    priceRange: "Rp 40.000 - Rp 450.000",
    serviceType: [
      "Servis Rutin Motor",
      "Modifikasi Motor",
      "Jasa Bubut Custom",
      "Bubut Velg Motor",
      "Express Service",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// JSON-LD: FAQ Schema — NEW for SEO
function FAQJsonLd() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Berapa biaya servis rutin motor matic?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Biaya servis rutin motor matic mulai dari Rp 40.000 – Rp 80.000 tergantung jenis servis. Sudah termasuk jasa, oli, dan pengecekan komponen penting.",
        },
      },
      {
        "@type": "Question",
        name: "Apakah bisa booking online?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ya! Anda bisa booking langsung melalui formulir di website ini atau chat via WhatsApp. Kami akan konfirmasi jadwal dalam 15 menit pada jam kerja.",
        },
      },
      {
        "@type": "Question",
        name: "Berapa lama waktu pengerjaan servis?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Servis rutin biasanya selesai dalam 30–60 menit. Modifikasi dan bubut custom bisa 1–7 hari kerja tergantung kompleksitas pekerjaan.",
        },
      },
      {
        "@type": "Question",
        name: "Apakah ada garansi setelah servis?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ya, semua pekerjaan kami bergaransi. Servis rutin garansi 7 hari, modifikasi garansi 30 hari, dan bubut custom garansi 14 hari.",
        },
      },
      {
        "@type": "Question",
        name: "Apa saja metode pembayaran yang diterima?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kami menerima pembayaran tunai, transfer bank (BCA, BRI, Mandiri), dan e-wallet (GoPay, OVO, DANA, ShopeePay).",
        },
      },
      {
        "@type": "Question",
        name: "Apakah melayani mobil juga?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ya, kami juga melayani servis dan modifikasi mobil. Silakan konsultasi terlebih dahulu via WhatsApp untuk layanan mobil.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
    />
  );
}

export default async function LandingPage() {
  const [data, queueData] = await Promise.all([
    fetchLandingData(),
    fetchQueueData(),
  ]);

  return (
    <>
      <BusinessJsonLd data={data} />
      <FAQJsonLd />
      <LandingClient initialData={data} initialQueue={queueData} />
    </>
  );
}
