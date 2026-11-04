import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { api, clientIp, HttpError, ok, readJson } from '@/lib/http';
import { assertRate } from '@/lib/ratelimit';
import { getDb } from '@/lib/db';
import { pendingRegistrations, users } from '@/lib/db/schema';
import { normalizeEmail } from '@/lib/validators';
import { verifyOtp } from '@/lib/otp';
import { getSetting } from '@/lib/settings';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const POST = api(async (req) => {
  const { email: raw, code } = await readJson(req, z.object({ email: z.string().trim().max(254), code: z.string().trim().min(4).max(10) }));
  const email = normalizeEmail(raw);
  const ip = clientIp(req);
  assertRate(`regv:email:${email}`, 10, 3600, '嘗試次數過多，請稍後再試');
  if (!verifyOtp(email, 'register', code)) throw new HttpError(400, '驗證碼不正確或已過期');
  const db = getDb();
  const p = db.select().from(pendingRegistrations).where(eq(pendingRegistrations.email, email)).get();
  if (!p) throw new HttpError(400, '註冊資料已失效，請重新註冊');
  if (db.select({ id: users.id }).from(users).where(eq(users.username, p.username)).get() || db.select({ id: users.id }).from(users).where(eq(users.email, email)).get())
    throw new HttpError(409, '用戶名或電郵已被使用');

  const domains = (getSetting('teacher_domains') ?? '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
  const mode = getSetting('teacher_signup') ?? 'approval';
  const autoOk = p.role === 'parent' || mode === 'auto' || domains.includes(email.split('@')[1]);
  const id = randomUUID();
  const now = Date.now();
  db.insert(users).values({ id, role: p.role, username: p.username, email, displayName: p.displayName, passwordHash: p.passwordHash, status: autoOk ? 'active' : 'pending', emailVerifiedAt: now, createdAt: now }).run();
  db.delete(pendingRegistrations).where(eq(pendingRegistrations.email, email)).run();
  audit({ actorId: id, action: 'register.complete', target: p.role, ip });
  return ok({ pending: !autoOk });
});
