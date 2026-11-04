import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/password';
import { tempPassword } from '@/lib/tempPassword';
import { destroyUserSessions } from '@/lib/session';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
/** 管理員管理老師／家長帳號：批准、停用、啟用、重設密碼 */
export const PATCH = api(async (req, ctx) => {
  const admin = await requireUser(['admin']);
  const { id } = await ctx.params;
  const { action } = await readJson(req, z.object({ action: z.enum(['approve', 'disable', 'enable', 'reset_password']) }));
  const db = getDb();
  const target = db.select().from(users).where(eq(users.id, id)).get();
  if (!target || target.role === 'student') throw new HttpError(404, '找不到此帳號');
  if (target.id === admin.id) throw new HttpError(400, '不能對自己的帳號執行此操作');
  if (target.role === 'admin') throw new HttpError(403, '不能對其他管理員執行此操作');
  if (action === 'reset_password') {
    const pw = tempPassword();
    db.update(users).set({ passwordHash: await hashPassword(pw), mustChangePassword: true }).where(eq(users.id, id)).run();
    destroyUserSessions(id);
    audit({ actorId: admin.id, action: 'user.reset_password', target: id });
    return ok({ password: pw });
  }
  db.update(users).set({ status: action === 'disable' ? 'disabled' : 'active' }).where(eq(users.id, id)).run();
  if (action === 'disable') destroyUserSessions(id);
  audit({ actorId: admin.id, action: `user.${action}`, target: id });
  return ok();
});
