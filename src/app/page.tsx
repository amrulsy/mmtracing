import { Suspense } from "react";
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

// JSON-LD Structured Data for Local Business SEO
function JsonLd({ data }: { data: LandingData | null }) {
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

export default async function LandingPage() {
  const [data, queueData] = await Promise.all([
    fetchLandingData(),
    fetchQueueData(),
  ]);

  return (
    <>
      <JsonLd data={data} />
      <LandingClient initialData={data} initialQueue={queueData} />
    </>
  );
}
