import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getViewableStudent, getManagedClass } from '@/lib/access';
import { getDb } from '@/lib/db';
import { attemptAnswers, attempts, bindCodes, broadcastReceipts, mistakes, parentLinks, sessions, users } from '@/lib/db/schema';
import { friendlyPassword } from '@/lib/classes';
import { hashPassword } from '@/lib/password';
import { destroyUserSessions } from '@/lib/session';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

async function manage(id: string) {
  const u = await requireUser(['admin', 'teacher']);
  const { student, cls } = getViewableStudent(u, id);
  if (!cls) throw new HttpError(404, '找不到學生所屬班級');
  getManagedClass(u, cls.id);
  return { u, student };
}

export const PATCH = api(async (req, ctx) => {
  const { id } = await ctx.params;
  const { u, student } = await manage(id);
  const b = await readJson(req, z.object({ action: z.enum(['reset_password', 'disable', 'enable', 'approve', 'set_note']), note: z.string().max(60).optional() }));
  const db = getDb();
  if (b.action === 'reset_password') {
    const pw = friendlyPassword();
    db.update(users).set({ passwordHash: await hashPassword(pw), mustChangePassword: false }).where(eq(users.id, id)).run();
    destroyUserSessions(id);
    audit({ actorId: u.id, action: 'student.reset_password', target: id });
    return ok({ password: pw, nickname: student.nickname });
  }
  if (b.action === 'disable') {
    db.update(users).set({ status: 'disabled' }).where(eq(users.id, id)).run();
    destroyUserSessions(id);
  } else if (b.action === 'enable' || b.action === 'approve') db.update(users).set({ status: 'active' }).where(eq(users.id, id)).run();
  else db.update(users).set({ note: b.note?.trim() || null }).where(eq(users.id, id)).run();
  audit({ actorId: u.id, action: `student.${b.action}`, target: id });
  return ok();
});

/** 徹底刪除學生及其全部學習記錄（符合「刪除個人資料」的要求），不可還原 */
export const DELETE = api(async (_req, ctx) => {
  const { id } = await ctx.params;
  const { u, student } = await manage(id);
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(attemptAnswers).where(eq(attemptAnswers.userId, id)).run();
    tx.delete(attempts).where(eq(attempts.userId, id)).run();
    tx.delete(mistakes).where(eq(mistakes.userId, id)).run();
    tx.delete(broadcastReceipts).where(eq(broadcastReceipts.userId, id)).run();
    tx.delete(parentLinks).where(eq(parentLinks.studentId, id)).run();
    tx.delete(bindCodes).where(eq(bindCodes.studentId, id)).run();
    tx.delete(sessions).where(eq(sessions.userId, id)).run();
    tx.delete(users).where(eq(users.id, id)).run();
  });
  audit({ actorId: u.id, action: 'student.delete', target: id, meta: { nickname: student.nickname } });
  return ok();
});
