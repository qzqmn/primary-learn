import { z } from 'zod';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { encryptKey, readConfig, resolveApiKey, sentLast24h, writeConfig, type MailConfig } from '@/lib/mail';
import { isValidEmail, normalizeEmail } from '@/lib/validators';
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

export const GET = api(async () => {
  await requireUser(['admin']);
  return ok({ config: view() });
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

