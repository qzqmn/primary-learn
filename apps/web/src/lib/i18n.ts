/**
 * 繁中／英字典。目前只覆蓋「主要導覽、通用按鈕、標題」等共用字串，
 * 並非全站翻譯；各頁面內文仍以繁中為主（見 README「雙語介面覆蓋範圍」）。
 */
export type Locale = 'zh-HK' | 'en';

export const DEFAULT_LOCALE: Locale = 'zh-HK';
export const LOCALES: readonly Locale[] = ['zh-HK', 'en'];

export const LOCALE_LABEL: Record<Locale, string> = {
  'zh-HK': '繁中',
  en: 'EN',
};

const zhHK = {
  // 品牌與標題
  'app.name': '學童通',
  'app.subtitle': '香港小學 P1–P6 教學與練習',
  'title.home': '首頁',
  'title.learning': '我的學習',
  'title.badges': '我的徽章',
  'title.mistakes': '錯題本',
  'title.review': '複習',
  'title.heatmap': '學習熱圖',
  'title.papers': '試卷',
  'title.language': '介面語言',
  'title.earned': '已獲得',
  'title.locked': '尚未獲得',
  // 主要導覽
  'nav.learn': '我的學習',
  'nav.mistakes': '錯題本',
  'nav.review': '複習',
  'nav.heatmap': '學習熱圖',
  'nav.papers': '試卷',
  'nav.badges': '徽章',
  'nav.admin': '管理後台',
  'nav.parent': '家長專區',
  'nav.home': '首頁',
  'nav.logout': '登出',
  'nav.account': '帳號設定',
  // 通用按鈕
  'btn.save': '儲存',
  'btn.cancel': '取消',
  'btn.confirm': '確認',
  'btn.back': '返回',
  'btn.next': '下一題',
  'btn.submit': '提交',
  'btn.start': '開始',
  'btn.finish': '完成',
  'btn.retry': '重試',
  'btn.close': '關閉',
  'btn.delete': '刪除',
  'btn.edit': '編輯',
  'btn.login': '登入',
  'btn.register': '註冊',
  'btn.search': '搜尋',
  'btn.export': '匯出',
  'btn.download': '下載',
} as const;

export type Key = keyof typeof zhHK;

const en: Record<Key, string> = {
  'app.name': 'HK Primary Learn',
  'app.subtitle': 'HK Primary P1–P6 learning & practice',
  'title.home': 'Home',
  'title.learning': 'My learning',
  'title.badges': 'My badges',
  'title.mistakes': 'Mistake book',
  'title.review': 'Review',
  'title.heatmap': 'Learning heatmap',
  'title.papers': 'Past papers',
  'title.language': 'Language',
  'title.earned': 'Earned',
  'title.locked': 'Not earned yet',
  'nav.learn': 'My learning',
  'nav.mistakes': 'Mistake book',
  'nav.review': 'Review',
  'nav.heatmap': 'Heatmap',
  'nav.papers': 'Past papers',
  'nav.badges': 'Badges',
  'nav.admin': 'Admin',
  'nav.parent': 'Parent area',
  'nav.home': 'Home',
  'nav.logout': 'Log out',
  'nav.account': 'Account',
  'btn.save': 'Save',
  'btn.cancel': 'Cancel',
  'btn.confirm': 'Confirm',
  'btn.back': 'Back',
  'btn.next': 'Next',
  'btn.submit': 'Submit',
  'btn.start': 'Start',
  'btn.finish': 'Finish',
  'btn.retry': 'Retry',
  'btn.close': 'Close',
  'btn.delete': 'Delete',
  'btn.edit': 'Edit',
  'btn.login': 'Log in',
  'btn.register': 'Register',
  'btn.search': 'Search',
  'btn.export': 'Export',
  'btn.download': 'Download',
};

export const dictionaries: Record<Locale, Record<Key, string>> = { 'zh-HK': zhHK, en };

export function translate(locale: Locale, key: Key): string {
  return dictionaries[locale][key] ?? zhHK[key] ?? key;
}
