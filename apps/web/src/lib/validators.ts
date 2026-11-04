import type { Role } from './db/schema';

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESERVED = new Set(['admin', 'administrator', 'root', 'system', 'support', 'api', 'setup', 'login', 'null']);

export const normalizeUsername = (v: string) => v.trim().toLowerCase();
export const normalizeEmail = (v: string) => v.trim().toLowerCase();

export function isValidEmail(v: string): boolean {
  return v.length <= 254 && EMAIL_RE.test(v);
}

/** 回傳錯誤訊息；合法則回傳 null。allowReserved 只給設定精靈使用。 */
export function checkUsername(raw: string, allowReserved = false): string | null {
  const v = normalizeUsername(raw);
  if (!USERNAME_RE.test(v)) return '用戶名須為 3–20 個字元，只可使用小寫英文字母、數字、「.」「_」「-」，並以字母或數字開頭';
  if (!allowReserved && RESERVED.has(v)) return '此用戶名已被保留，請換一個';
  return null;
}

const MIN_LEN: Record<Role, number> = { admin: 10, teacher: 10, parent: 8, student: 6 };
const COMMON = new Set(['password', 'password1', '12345678', '123456789', '1234567890', 'qwertyuiop', 'iloveyou1', '11111111']);

export function minPasswordLength(role: Role) {
  return MIN_LEN[role];
}

export function checkPassword(pw: string, role: Role, ctx: { username?: string | null; email?: string | null } = {}): string | null {
  const min = MIN_LEN[role];
  if (pw.length < min) return `密碼至少需要 ${min} 個字元`;
  if (pw.length > 128) return '密碼不可超過 128 個字元';
  if (new Set(pw).size < 4) return '密碼太簡單，請使用更多不同的字元';
  if (COMMON.has(pw.toLowerCase())) return '這是常見密碼，請換一個';
  const lower = pw.toLowerCase();
  if (ctx.username && ctx.username.length >= 3 && lower.includes(ctx.username.toLowerCase())) return '密碼不可包含用戶名';
  const local = ctx.email?.split('@')[0];
  if (local && local.length >= 4 && lower.includes(local.toLowerCase())) return '密碼不可包含電郵帳號';
  return null;
}
