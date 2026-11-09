/* 學童通 Service Worker
 *
 * 安全底線（重要）：
 *  - /api/ 下的請求一律不攔截、不快取。練習題目、答案、批改結果、個人資料都走 API，
 *    任何含答案的回應都絕對不能進 Cache Storage。
 *  - 只處理同源 GET；POST 與跨域請求直接放行。
 *  - RSC / 資料請求（?_rsc=、RSC 標頭）也不快取，避免把含個人資料的 payload 存起來。
 *  - 任何帶 no-store / private / Set-Cookie 的回應都不寫入快取。
 *
 * 策略：靜態資源 cache-first；頁面（navigation）network-first，離線時才用快取外殼。
 * 版本號變動會在 activate 時清掉舊快取。
 */
const VERSION = 'v0.2.4';
const STATIC_CACHE = `hkpl-static-${VERSION}`;
const PAGE_CACHE = `hkpl-pages-${VERSION}`;
const PRECACHE = ['/icon.svg', '/manifest.webmanifest'];
const NO_STORE = /no-store|private/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (pathname) =>
  pathname.startsWith('/_next/static/') ||
  pathname === '/icon.svg' ||
  pathname === '/favicon.ico' ||
  /\.(?:css|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|map)$/.test(pathname);

const storeable = (res) =>
  !!res &&
  res.ok &&
  res.type === 'basic' &&
  !NO_STORE.test(res.headers.get('Cache-Control') || '') &&
  !res.headers.has('Set-Cookie');

async function putIfStoreable(cache, req, res) {
  if (!storeable(res)) return;
  try {
    await cache.put(req, res.clone());
  } catch {
    /* 快取寫入失敗（容量不足等）不影響正常瀏覽 */
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  await putIfStoreable(cache, req, res);
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(req);
    await putIfStoreable(cache, req, res);
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    return new Response(
      '<!doctype html><html lang="zh-HK"><meta charset="utf-8"><title>離線 · 學童通</title>' +
        '<body style="font-family:system-ui;padding:2rem"><h1>目前離線</h1>' +
        '<p>請連上網絡後重試。練習題目與答案不會在離線時提供。</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return; // 不快取 SW 腳本本身
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return; // 永不快取 API
  if (url.searchParams.has('_rsc') || req.headers.has('RSC') || req.headers.has('Next-Router-State-Tree')) return; // 不快取 RSC 資料

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(req));
  }
  // 其餘請求（含動態端點）一律交給網絡，不寫入快取
});
