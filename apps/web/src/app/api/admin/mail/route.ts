import { z } from 'zod';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { encryptKey, readConfig, resolveApiKey, sentLast24h, writeConfig, type MailConfig } from '@/lib/mail';
import { isValidEmail, normalizeEmail } from '@/lib/validators';
import { getSetting, setSetting } from '@/lib/settings';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function view() {
  const c = readConfig();
  const { source } = resolveApiKey(c);
  return {
    configured: !!c,
    fromName: c?.fromName ?? '',
    fromEmail: c?.fromEmail ?? '',
    replyTo: c?.replyTo ?? '',
    dailyLimit: c?.dailyLimit ?? 100,
    hasApiKey: !!source,
    apiKeySource: source,
    enabled: !!c?.enabled,
    verifiedAt: c?.verifiedAt ?? null,
    sentLast24h: sentLast24h(),
  };
}

/**
 * 郵件模板存於 settings。寄信模組（src/lib/mail/templates.ts）需讀取這些覆寫才會生效；
 * 未設定時回傳下列預設值，維持原有郵件內容。
 */
const KEYS = {
  verifySubject: 'tpl.verify.subject',
  verifyBody: 'tpl.verify.body',
  broadcastSubject: 'tpl.broadcast.subject',
  broadcastBody: 'tpl.broadcast.body',
} as const;

const DEFAULTS = {
  verifySubject: '【{{org}}】{{name}}，你的驗證碼是 {{code}}',
  verifyBody: '{{name}} 你好：\n\n你的驗證碼是 {{code}}，{{minutes}} 分鐘內有效。如果不是你本人操作，請忽略此郵件，帳號不會有任何變動。',
  broadcastSubject: '【{{org}}】{{title}}',
  broadcastBody: '{{name}} 你好：\n\n{{body}}\n\n不想再收到此類通知？{{unsubscribeUrl}}',
} as const;

type MailTemplates = {
  verifySubject: string;
  verifyBody: string;
  broadcastSubject: string;
  broadcastBody: string;
};

function readTemplates(): MailTemplates {
  return {
    verifySubject: getSetting(KEYS.verifySubject) ?? DEFAULTS.verifySubject,
    verifyBody: getSetting(KEYS.verifyBody) ?? DEFAULTS.verifyBody,
    broadcastSubject: getSetting(KEYS.broadcastSubject) ?? DEFAULTS.broadcastSubject,
    broadcastBody: getSetting(KEYS.broadcastBody) ?? DEFAULTS.broadcastBody,
  };
}

export const GET = api(async () => {
  await requireUser(['admin']);
  return ok({ config: view(), templates: readTemplates() });
});

const body = z.object({
  apiKey: z.string().trim().max(200).optional(),
  fromName: z.string().trim().max(60),
  fromEmail: z.string().max(254),
  replyTo: z.string().max(254).optional(),
  dailyLimit: z.number().int().min(1, '每日上限至少為 1').max(100000),
});

export const PUT = api(async (req) => {
  const me = await requireUser(['admin']);
  const b = await readJson(req, body);
  const fromEmail = normalizeEmail(b.fromEmail);
  if (!isValidEmail(fromEmail)) throw new HttpError(400, '發件地址格式不正確');
  const replyTo = b.replyTo ? normalizeEmail(b.replyTo) : '';
  if (replyTo && !isValidEmail(replyTo)) throw new HttpError(400, '回覆地址格式不正確');
  const old = readConfig();
  const next: MailConfig = {
    provider: 'resend',
    apiKeyEnc: b.apiKey ? encryptKey(b.apiKey) : old?.apiKeyEnc,
    fromName: b.fromName,
    fromEmail,
    replyTo: replyTo || undefined,
    dailyLimit: b.dailyLimit,
    enabled: false,
    verifiedAt: undefined, // 任何改動都要重新發送測試郵件
  };
  // 只改每日上限時不必重測
  if (old && !b.apiKey && old.fromEmail === fromEmail && old.fromName === b.fromName && (old.replyTo ?? '') === replyTo) {
    next.enabled = old.enabled;
    next.verifiedAt = old.verifiedAt;
  }
  writeConfig(next);
  audit({ actorId: me.id, action: 'mail.config_updated', meta: { keyChanged: !!b.apiKey } });
  return ok({ config: view() });
});

const templatesBody = z.object({
  verifySubject: z.string().trim().min(1, '請輸入驗證信標題').max(200),
  verifyBody: z.string().trim().min(1, '請輸入驗證信內容').max(4000),
  broadcastSubject: z.string().trim().min(1, '請輸入廣播信標題').max(200),
  broadcastBody: z.string().trim().min(1, '請輸入廣播信內容').max(4000),
});

/** 編輯驗證信／廣播信標題與內容模板（保留「發送測試郵件」功能不受影響） */
export const PATCH = api(async (req) => {
  const me = await requireUser(['admin']);
  const b = await readJson(req, templatesBody);
  setSetting(KEYS.verifySubject, b.verifySubject);
  setSetting(KEYS.verifyBody, b.verifyBody);
  setSetting(KEYS.broadcastSubject, b.broadcastSubject);
  setSetting(KEYS.broadcastBody, b.broadcastBody);
  audit({ actorId: me.id, action: 'mail.templates_updated' });
  return ok({ templates: readTemplates() });
});
