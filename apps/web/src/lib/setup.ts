import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { users } from './db/schema';
import { deleteSetting, getSetting, setSetting } from './settings';
import { normalizeCode, randomGroups, safeEqual } from './crypto';

/** 只要存在任何管理員，就視為設定完成，/setup 永久關閉 */
export function isSetupComplete(): boolean {
  return !!getDb().select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1).get();
}

export const setupTokenRequired = () => process.env.SETUP_REQUIRE_TOKEN !== 'false';

function expectedToken(): string | null {
  return process.env.SETUP_TOKEN?.trim() || getSetting('setup_token');
}

/** 啟動時呼叫：未設定完成則確保有一個設定碼並回傳（供打印到日誌） */
export function ensureSetupToken(): string | null {
  if (isSetupComplete()) {
    deleteSetting('setup_token');
    return null;
  }
  if (!setupTokenRequired()) return null;
  let token = expectedToken();
  if (!token) {
    token = randomGroups(2, 4);
    setSetting('setup_token', token);
  }
  return token;
}

export function checkSetupToken(input: string | undefined): boolean {
  if (!setupTokenRequired()) return true;
  const expected = expectedToken();
  if (!expected || !input) return false;
  return safeEqual(normalizeCode(input), normalizeCode(expected));
}
