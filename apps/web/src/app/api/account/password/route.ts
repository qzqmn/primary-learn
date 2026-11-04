import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { assertRate } from '@/lib/ratelimit';
import { checkPassword } from '@/lib/validators';
import { hashPassword, verifyPassword } from '@/lib/password';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { destroyUserSessions } from '@/lib/session';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const body = z.object({ currentPassword: z.string().max(256), newPassword: z.string().max(200) });

export const POST = api(async (req) => {
  const me = await requireUser();
  assertRate(`pwchange:${me.id}`, 10, 900);
  const b = await readJson(req, body);
  const row = getDb().select().from(users).where(eq(users.id, me.id)).get()!;
  if (!(await verifyPassword(row.passwordHash, b.currentPassword))) throw new HttpError(400, '目前的密碼不正確');
  const err = checkPassword(b.newPassword, me.role, { username: me.username, email: me.email });
  if (err) throw new HttpError(400, err);
  if (b.newPassword === b.currentPassword) throw new HttpError(400, '新密碼不可與目前的密碼相同');
  getDb().update(users).set({ passwordHash: await hashPassword(b.newPassword), mustChangePassword: false }).where(eq(users.id, me.id)).run();
  destroyUserSessions(me.id, me.sessionId); // 其他裝置全部登出
  audit({ actorId: me.id, action: 'password.changed' });
  return ok();
});
