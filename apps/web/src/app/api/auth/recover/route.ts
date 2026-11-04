import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { api, clientIp, HttpError, ok, readJson } from '@/lib/http';
import { assertRate } from '@/lib/ratelimit';
import { findUserByIdentifier, normalizeIdentifier } from '@/lib/users';
import { checkPassword } from '@/lib/validators';
import { hashPassword } from '@/lib/password';
import { getDb } from '@/lib/db';
import { recoveryCodes, users } from '@/lib/db/schema';
import { hmac, normalizeCode } from '@/lib/crypto';
import { destroyUserSessions } from '@/lib/session';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const body = z.object({
  identifier: z.string().trim().min(1).max(254),
  recoveryCode: z.string().trim().min(8).max(32),
  newPassword: z.string().max(200),
});

/** 後備方案：管理員用設定時保存的恢復碼重設密碼（郵件服務壞了也能救） */
export const POST = api(async (req) => {
  const b = await readJson(req, body);
  const ip = clientIp(req);
  const ident = normalizeIdentifier(b.identifier);
  if (ip) assertRate(`recover:ip:${ip}`, 20, 3600);
  assertRate(`recover:ident:${ident}`, 5, 900, '嘗試次數過多，請 15 分鐘後再試');

  const user = findUserByIdentifier(b.identifier);
  const pwErr = checkPassword(b.newPassword, 'admin', { username: user?.username, email: user?.email });
  if (pwErr) throw new HttpError(400, pwErr);
  const fail = () => new HttpError(400, '用戶名或恢復碼不正確');
  if (!user || user.role !== 'admin') throw fail();

  const hash = hmac('recovery', normalizeCode(b.recoveryCode));
  const row = getDb()
    .select()
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, user.id), eq(recoveryCodes.codeHash, hash), isNull(recoveryCodes.usedAt)))
    .get();
  if (!row) throw fail();

  getDb().update(recoveryCodes).set({ usedAt: Date.now() }).where(eq(recoveryCodes.id, row.id)).run();
  getDb().update(users).set({ passwordHash: await hashPassword(b.newPassword), mustChangePassword: false }).where(eq(users.id, user.id)).run();
  destroyUserSessions(user.id);
  audit({ actorId: user.id, action: 'password.reset_by_recovery_code', ip });
  return ok();
});
