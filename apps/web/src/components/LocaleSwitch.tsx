'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_LABEL, LOCALES, translate, type Key, type Locale } from '@/lib/i18n';

const STORAGE_KEY = 'hkpl-locale';
const COOKIE_KEY = 'hkpl-locale';

/* 簡易模組級訂閱（不使用 context）：任何元件呼叫 useLocale() 都會隨語系重渲。 */
let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const getSnapshot = (): Locale => current;
const getServerSnapshot = (): Locale => DEFAULT_LOCALE;

function applyLocale(locale: Locale, persist: boolean) {
  current = locale;
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* 隱私模式可能禁用 localStorage */
    }
    // 寫入 cookie，讓伺服端（或未來的 SSR 翻譯）也能讀到偏好
    document.cookie = `${COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }
  document.documentElement.lang = locale === 'zh-HK' ? 'zh-HK' : 'en';
  listeners.forEach((fn) => fn());
}

/** 切換語系：寫入 localStorage + cookie，並通知所有訂閱者。 */
export function setLocale(locale: Locale) {
  if (!LOCALES.includes(locale)) return;
  applyLocale(locale, true);
}

/** 依目前語系翻譯。請在元件內同時使用 useLocale()，切換時才會重新渲染。 */
export function t(key: Key): string {
  return translate(getSnapshot(), key);
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function readStored(): Locale | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'zh-HK' || v === 'en') return v;
  } catch {
    /* 忽略 */
  }
  const m = document.cookie.match(/(?:^|;\s*)hkpl-locale=(zh-HK|en)(?:;|$)/);
  return m ? (m[1] as Locale) : null;
}

export function LocaleSwitch() {
  const locale = useLocale();
  const router = useRouter();

  // 首次掛載才讀取瀏覽器偏好，避免 SSR 與客戶端首次渲染不一致（hydration mismatch）
  useEffect(() => {
    const stored = readStored();
    if (stored && stored !== current) applyLocale(stored, false);
    else document.documentElement.lang = current === 'zh-HK' ? 'zh-HK' : 'en';
  }, []);

  function switchTo(l: Locale) {
    setLocale(l);
    // cookie 已更新，讓伺服器端頁面（RSC）也用新語系重渲
    router.refresh();
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1 rounded-full border-2 border-line bg-white/95 px-2 py-1 shadow-md backdrop-blur">
      <span className="hidden px-1 text-xs font-semibold text-ink-soft sm:inline">{t('title.language')}</span>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={locale === l}
          aria-label={l === 'zh-HK' ? '切換為繁體中文' : 'Switch to English'}
          className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${locale === l ? 'bg-ballpoint text-white' : 'text-ink-soft hover:bg-ballpoint-tint'}`}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
