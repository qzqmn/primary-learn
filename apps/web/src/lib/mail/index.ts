import { and, eq, gte } from 'drizzle-orm';
import { getDb } from '../db';
import { emailLogs } from '../db/schema';
import { decrypt, encrypt } from '../crypto';
import { getOrgName, getSetting, setSetting } from '../settings';
import { MailError, resendSend } from './resend';
import { HttpError } from '../http';

export { MailError };

export type MailConfig = {
  provider: 'resend';
  apiKeyEnc?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  dailyLimit: number;
  /** 測試郵件發送成功才會設定；設定一有改動即清除，必須重新測試 */
  verifiedAt?: number;
  enabled: boolean;
};

const KEY = 'mail_config';

export function readConfig(): MailConfig | null {
  const raw = getSetting(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MailConfig;
  } catch {
    return null;
  }
}

export function writeConfig(c: MailConfig) {
  setSetting(KEY, JSON.stringify(c));
}

export function resolveApiKey(c: MailConfig | null): { key: string | null; source: 'db' | 'env' | null } {
  if (c?.apiKeyEnc) {
    try {
      return { key: decrypt(c.apiKeyEnc), source: 'db' };
    } catch {
      /* 密鑰更換後無法解密：視為未設定 */
    }
  }
  const env = process.env.RESEND_API_KEY?.trim();
  return env ? { key: env, source: 'env' } : { key: null, source: null };
}

export const encryptKey = encrypt;

/** 郵件服務可用 = 已啟用 且 測試成功過 且 有 API Key */
export function isMailReady(): boolean {
  const c = readConfig();
  return !!c && c.enabled && !!c.verifiedAt && !!resolveApiKey(c).key;
}

export function sentLast24h(): number {
  const since = Date.now() - 24 * 3600_000;
  return getDb().select({ id: emailLogs.id }).from(emailLogs).where(and(eq(emailLogs.status, 'sent'), gte(emailLogs.ts, since))).all().length;
}

type Mail = { to: string; purpose: string; subject: string; html: string; text: string };

/** skipReadyCheck 只給「測試郵件」使用 */
export async function sendMail(m: Mail, opts: { skipReadyCheck?: boolean } = {}): Promise<void> {
  const c = readConfig();
  const { key } = resolveApiKey(c);
  if (!c || !key) throw new MailError('尚未設定郵件服務');
  if (!opts.skipReadyCheck && !(c.enabled && c.verifiedAt)) throw new MailError('郵件服務尚未啟用');
  if (sentLast24h() >= c.dailyLimit) throw new HttpError(429, '已達每日郵件發送上限');
  const from = c.fromName ? `${c.fromName.replace(/[<>"]/g, '')} <${c.fromEmail}>` : c.fromEmail;
  const db = getDb();
  try {
    const r = await resendSend(key, { from, to: m.to, subject: m.subject, html: m.html, text: m.text, replyTo: c.replyTo || undefined });
    db.insert(emailLogs).values({ ts: Date.now(), toEmail: m.to, purpose: m.purpose, status: 'sent', providerId: r.id }).run();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    db.insert(emailLogs).values({ ts: Date.now(), toEmail: m.to, purpose: m.purpose, status: 'failed', error: msg.slice(0, 300) }).run();
    throw e;
  }
}

/** 背景發送：不阻塞請求，失敗只記日誌（避免用回應時間洩露帳號是否存在） */
export function sendMailBackground(m: Mail) {
  void sendMail(m).catch((e) => console.error('[mail] send failed:', e instanceof Error ? e.message : e));
}

export const orgName = getOrgName;
