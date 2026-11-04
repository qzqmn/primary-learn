import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { checkUsername, isValidEmail, normalizeEmail, normalizeUsername } from '@/lib/validators';
import { hashPassword } from '@/lib/password';
import { tempPassword } from '@/lib/tempPassword';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
/** 管理員直接建立老師帳號，取得一次性臨時密碼；老師首次登入須改密碼 */
export const POST = api(async (req) => {
  const admin = await requireUser(['admin']);
  const b = await readJson(req, z.object({ username: z.string().trim().max(30), displayName: z.string().trim().min(1).max(30), email: z.string().trim().max(254).optional() }));
  const username = normalizeUsername(b.username);
  const ue = checkUsername(username);
  if (ue) throw new HttpError(400, ue);
  const email = b.email ? normalizeEmail(b.email) : null;
  if (email && !isValidEmail(email)) throw new HttpError(400, '電郵格式不正確');
  const db = getDb();
  if (db.select({ id: users.id }).from(users).where(eq(users.username, username)).get()) throw new HttpError(409, '此用戶名已被使用');
  if (email && db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) throw new HttpError(409, '此電郵已被使用');
  const password = tempPassword();
  const id = randomUUID();
  db.insert(users).values({ id, role: 'teacher', username, email, displayName: b.displayName, passwordHash: await hashPassword(password), mustChangePassword: true, createdAt: Date.now() }).run();
  audit({ actorId: admin.id, action: 'teacher.create', target: id });
  return ok({ username, password });
});
