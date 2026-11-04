import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { assertRate } from '@/lib/ratelimit';
import { isMailReady, orgName, sendMail } from '@/lib/mail';
import { codeMail } from '@/lib/mail/templates';
import { issueOtp, OTP_TTL_MIN, verifyOtp } from '@/lib/otp';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('send') }),
  z.object({ action: z.literal('confirm'), code: z.string().trim().regex(/^\d{6}$/, '請輸入 6 位數字驗證碼') }),
]);

/** 登入用戶驗證自己的電郵（電郵驗證後才可用「電郵找回密碼」） */
export const POST = api(async (req) => {
  const me = await requireUser();
  if (!me.email) throw new HttpError(400, '此帳號沒有登記電郵');
  if (me.emailVerified) return ok({ alreadyVerified: true });
  const b = await readJson(req, body);
  if (b.action === 'send') {
    if (!isMailReady()) throw new HttpError(400, '郵件服務尚未啟用，請先在「系統設定 → 郵件服務」完成設定並發送測試郵件');
    assertRate(`verify-mail:${me.id}`, 5, 3600);
    const code = issueOtp(me.email, 'verify_email');
    await sendMail({ to: me.email, purpose: 'verify_email', ...codeMail({ org: orgName(), purpose: 'verify_email', code, minutes: OTP_TTL_MIN }) });
    return ok();
  }
  assertRate(`verify-mail-confirm:${me.id}`, 10, 3600);
  if (!verifyOtp(me.email, 'verify_email', b.code)) throw new HttpError(400, '驗證碼不正確或已過期');
  getDb().update(users).set({ emailVerifiedAt: Date.now() }).where(eq(users.id, me.id)).run();
  audit({ actorId: me.id, action: 'email.verified' });
  return ok();
});
