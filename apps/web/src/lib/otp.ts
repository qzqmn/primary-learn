import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from './db';
import { emailOtps } from './db/schema';
import { hmac, randomDigits, safeEqual } from './crypto';
import { HttpError } from './http';

export type OtpPurpose = 'reset_password' | 'verify_email' | 'register';
export const OTP_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60_000;

const hashCode = (email: string, purpose: string, code: string) => hmac('otp', `${email}\0${purpose}\0${code}`);

/** 產生 6 位驗證碼；同一電郵＋用途 60 秒內不可重發，舊碼立即作廢 */
export function issueOtp(email: string, purpose: OtpPurpose): string {
  const db = getDb();
  const now = Date.now();
  const last = db
    .select()
    .from(emailOtps)
    .where(and(eq(emailOtps.email, email), eq(emailOtps.purpose, purpose)))
    .orderBy(desc(emailOtps.id))
    .limit(1)
    .get();
  if (last && now - last.createdAt < COOLDOWN_MS) throw new HttpError(429, '請等待約 1 分鐘後再重新發送驗證碼');
  db.update(emailOtps).set({ usedAt: now }).where(and(eq(emailOtps.email, email), eq(emailOtps.purpose, purpose), isNull(emailOtps.usedAt))).run();
  const code = randomDigits(6);
  db.insert(emailOtps)
    .values({ email, purpose, codeHash: hashCode(email, purpose, code), expiresAt: now + OTP_TTL_MIN * 60_000, createdAt: now })
    .run();
  return code;
}

/** 驗證成功即作廢；錯誤累計 5 次後該驗證碼失效 */
export function verifyOtp(email: string, purpose: OtpPurpose, code: string): boolean {
  const db = getDb();
  const now = Date.now();
  const row = db
    .select()
    .from(emailOtps)
    .where(and(eq(emailOtps.email, email), eq(emailOtps.purpose, purpose), isNull(emailOtps.usedAt)))
    .orderBy(desc(emailOtps.id))
    .limit(1)
    .get();
  if (!row || row.expiresAt <= now || row.attempts >= MAX_ATTEMPTS) return false;
  if (safeEqual(row.codeHash, hashCode(email, purpose, code.trim()))) {
    db.update(emailOtps).set({ usedAt: now }).where(eq(emailOtps.id, row.id)).run();
    return true;
  }
  db.update(emailOtps).set({ attempts: row.attempts + 1 }).where(eq(emailOtps.id, row.id)).run();
  return false;
}
