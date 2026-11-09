// CSP：收緊但不改成會讓現有頁面壞掉的嚴格 nonce 方案。
//  - 一律不開放 'unsafe-eval'（含開發模式），避免 eval / new Function 被濫用。
//  - object-src 'none'、base-uri 'self'、frame-ancestors 'none' 補上其他攻擊面的限制。
//  - script-src 仍保留 'unsafe-inline'：Next.js App Router（串流 RSC）會注入 inline script，
//    現階段移除會讓頁面直接壞掉。須待後續把這些 script 逐一 nonce 化、並由中介層
//    為每個回應產生 nonce 之後，才能拿掉 'unsafe-inline'。
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  serverExternalPackages: ['better-sqlite3', '@node-rs/argon2'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
