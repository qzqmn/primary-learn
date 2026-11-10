import type { MetadataRoute } from 'next';

/** PWA web app manifest；layout.tsx 透過 metadata.manifest 指向 /manifest.webmanifest */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '學童通 · HK Primary Learn',
    short_name: '學童通',
    description: '香港小學 P1–P6 教學與練習平台（開源、可自行部署）',
    lang: 'zh-HK',
    start_url: '/learn',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f6fb',
    theme_color: '#2347c5',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
