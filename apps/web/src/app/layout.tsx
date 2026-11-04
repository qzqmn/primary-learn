import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '學童通', template: '%s · 學童通' },
  description: '香港小學 P1–P6 教學與練習平台（開源、可自行部署）',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2347c5' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
