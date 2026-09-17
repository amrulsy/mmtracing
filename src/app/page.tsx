import LandingClient, { type LandingData, type QueueData } from "@/components/landing/LandingClient";
import type { Metadata } from "next";

async function fetchLandingData<T>(endpoint: string, revalidate: number): Promise<T | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:5000";
    const res = await fetch(`${backendUrl}/api/v1/landing/${endpoint}`, { next: { revalidate }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchLandingData<LandingData>("content", 60);
  const seo = data?.landing_seo;
  if (!seo?.title && !seo?.description && !seo?.canonicalUrl) return {};
  return {
    title: seo.title || undefined,
    description: seo.description || undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph: { title: seo.title || undefined, description: seo.description || undefined, url: seo.canonicalUrl || undefined },
  };
}

export default async function LandingPage() {
  const [data, queueData] = await Promise.all([fetchLandingData<LandingData>("content", 60), fetchLandingData<QueueData>("queue", 30)]);
  const contact = data?.landing_contact;
  const isTemplateContent = contact?.whatsapp === "62274123456";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: data?.landing_header?.brandName || "MMT Racing",
    url: "https://mmtracing.com",
    ...(!isTemplateContent && contact?.phone ? { telephone: contact.phone } : {}),
    ...(!isTemplateContent && contact?.email ? { email: contact.email } : {}),
    ...(!isTemplateContent && contact?.address ? { address: contact.address } : {}),
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <LandingClient initialData={data} initialQueue={queueData} />
  </>;
}
