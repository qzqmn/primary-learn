import { z } from 'zod';
import { api, clientIp, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { assertRate } from '@/lib/ratelimit';
import { verifyPassword } from '@/lib/password';
import { applyStaged } from '@/lib/backup';
import { audit } from '@/lib/audit';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** 第二步：真正還原。需要再次輸入管理員密碼，並輸入「還原」二字確認。 */
export const POST = api(async (req) => {
  const admin = await requireUser(['admin']);
  assertRate(`restore-apply:${admin.id}`, 5, 3600, '嘗試次數過多，請 1 小時後再試');
  const { password, confirm } = await readJson(req, z.object({ password: z.string().max(256), confirm: z.string().max(10) }));
  if (confirm.trim() !== '還原') throw new HttpError(400, '請輸入「還原」二字以確認');
  const row = getDb().select({ h: users.passwordHash }).from(users).where(eq(users.id, admin.id)).get();
  if (!row || !(await verifyPassword(row.h, password))) {
    audit({ actorId: admin.id, action: 'backup.restore.denied', ip: clientIp(req) });
    throw new HttpError(403, '密碼不正確');
  }
  const r = await applyStaged();
  return ok({ safety: r.safety, info: r.info, relogin: true });
});
