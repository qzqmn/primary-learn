'use client';

import { useEffect } from 'react';

/** 只在正式環境註冊；開發模式不註冊，避免快取干擾 HMR 與除錯。 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 註冊失敗（例如瀏覽器封鎖）不影響網站正常使用
      });
    };

    // 等頁面載入完再註冊，避免與首次載入搶資源
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
