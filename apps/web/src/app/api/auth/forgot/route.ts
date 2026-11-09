import { z } from 'zod';
import { api, clientIp, ok, readJson } from '@/lib/http';
import { assertRate } from '@/lib/ratelimit';
import { findUserByIdentifier, normalizeIdentifier } from '@/lib/users';
import { isMailReady, orgName, sendMailBackground } from '@/lib/mail';
import { codeMail } from '@/lib/mail/templates';
import { issueOtp, OTP_TTL_MIN } from '@/lib/otp';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const POST = api(async (req) => {
  const { identifier } = await readJson(req, z.object({ identifier: z.string().trim().min(1, '請輸入用戶名或電郵').max(254) }));
  const ip = clientIp(req);
  const ident = normalizeIdentifier(identifier);
  if (ip) assertRate(`otp:ip:${ip}`, 20, 3600);
  assertRate(`otp:ident:${ident}`, 5, 3600);

  // 無論帳號是否存在、郵件是否可用，回應都一樣，避免洩露誰註冊過
  const user = findUserByIdentifier(identifier);
  if (user?.email && user.emailVerifiedAt && user.status !== 'disabled' && isMailReady()) {
    try {
      const code = issueOtp(user.email, 'reset_password');
      const org = orgName();
      sendMailBackground({ to: user.email, purpose: 'reset_password', ...codeMail({ org, purpose: 'reset_password', code, minutes: OTP_TTL_MIN, name: user.displayName }) });
      audit({ actorId: user.id, action: 'password.reset_requested', ip });
    } catch {
      /* 冷卻中等情況：同樣不對外透露 */
    }
  }
  return ok({ message: '如果帳號存在且已驗證電郵，驗證碼已發送到登記的電郵。' });
});
