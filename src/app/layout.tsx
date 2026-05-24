import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MMT Racing | Bengkel Motor, Modifikasi & Jasa Bubut Custom Cilacap",
    template: "%s | MMT Racing",
  },
  description: "MMT Racing adalah bengkel motor terpercaya di Widarapayung Wetan, Binangun, Cilacap. Spesialis servis rutin, modifikasi presisi tinggi, dan jasa bubut custom. Booking antrian online sekarang!",
  keywords: [
    "Bengkel Motor",
    "Servis Motor",
    "Modifikasi Motor",
    "Jasa Bubut",
    "Bubut Custom",
    "Bubut Velg Motor",
    "Bengkel Terpercaya",
    "MMT Racing",
    "Bengkel Motor Cilacap",
    "Bengkel Motor Binangun",
    "Servis Motor Cilacap",
    "Modifikasi Motor Cilacap",
    "Jasa Bubut Cilacap",
    "Bengkel Widarapayung",
    "Bengkel Binangun Cilacap",
  ],
  authors: [{ name: "MMT Racing" }],
  creator: "MMT Racing",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://mmtracing.com", // Ganti dengan URL asli jika sudah ada
    title: "MMT Racing | Bengkel Motor, Modifikasi & Jasa Bubut Custom Cilacap",
    description: "Spesialis servis rutin, modifikasi presisi tinggi, dan jasa bubut custom untuk motor. Cek antrian dan booking online di MMT Racing Cilacap.",
    siteName: "MMT Racing",
  },
  twitter: {
    card: "summary_large_image",
    title: "MMT Racing | Bengkel Motor, Modifikasi & Jasa Bubut Cilacap",
    description: "Spesialis servis rutin, modifikasi presisi tinggi, dan jasa bubut custom untuk motor di Widarapayung Wetan, Binangun, Cilacap.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased overflow-x-hidden selection:bg-primary/20 selection:text-primary`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
