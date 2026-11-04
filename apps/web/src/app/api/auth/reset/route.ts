import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, clientIp, HttpError, ok, readJson } from '@/lib/http';
import { assertRate } from '@/lib/ratelimit';
import { findUserByIdentifier, normalizeIdentifier } from '@/lib/users';
import { verifyOtp } from '@/lib/otp';
import { checkPassword } from '@/lib/validators';
import { hashPassword } from '@/lib/password';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { destroyUserSessions } from '@/lib/session';
import { isMailReady, orgName, sendMailBackground } from '@/lib/mail';
import { passwordChangedMail } from '@/lib/mail/templates';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const body = z.object({
  identifier: z.string().trim().min(1).max(254),
  code: z.string().trim().regex(/^\d{6}$/, '請輸入 6 位數字驗證碼'),
  newPassword: z.string().max(200),
});

export const POST = api(async (req) => {
  const b = await readJson(req, body);
  const ip = clientIp(req);
  const ident = normalizeIdentifier(b.identifier);
  if (ip) assertRate(`reset:ip:${ip}`, 30, 3600);
  assertRate(`reset:ident:${ident}`, 10, 3600);

  const user = findUserByIdentifier(b.identifier);
  // 先檢查密碼強度（不消耗驗證碼）；查無此人時用最嚴格的規則
  const pwErr = checkPassword(b.newPassword, user?.role ?? 'admin', { username: user?.username, email: user?.email });
  if (pwErr) throw new HttpError(400, pwErr);
  if (!user?.email || !verifyOtp(user.email, 'reset_password', b.code)) throw new HttpError(400, '驗證碼不正確或已過期');

  getDb()
    .update(users)
    .set({ passwordHash: await hashPassword(b.newPassword), mustChangePassword: false })
    .where(eq(users.id, user.id))
    .run();
  destroyUserSessions(user.id);
  audit({ actorId: user.id, action: 'password.reset_by_email', ip });
  if (isMailReady()) sendMailBackground({ to: user.email, purpose: 'password_changed', ...passwordChangedMail(orgName()) });
  return ok();
});
