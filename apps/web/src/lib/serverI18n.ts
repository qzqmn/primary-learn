import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, translate, type Key, type Locale } from './i18n';

/** LocaleSwitch 寫入的偏好 cookie；伺服器端頁面（RSC）也用它決定語言 */
export const LOCALE_COOKIE = 'hkpl-locale';

/** 在伺服器端元件讀取語系偏好（cookie），沒有就用預設繁中 */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return v === 'en' || v === 'zh-HK' ? v : DEFAULT_LOCALE;
}

/** 伺服器端版 t()：在 async 元件裡 `const t = await getServerT()` 後即可使用 */
export async function getServerT(): Promise<(key: Key) => string> {
  const locale = await getServerLocale();
  return (key: Key) => translate(locale, key);
}
