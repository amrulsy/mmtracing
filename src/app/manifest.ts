import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MMT Racing',
    short_name: 'MMT Racing',
    description: 'Bengkel motor, modifikasi presisi tinggi, dan jasa bubut custom di Cilacap. Cek antrian dan booking online.',
    id: '/',
    scope: '/',
    start_url: '/portal',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#dc2626',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
