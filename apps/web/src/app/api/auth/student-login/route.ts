import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { api, clientIp, HttpError, isSecureRequest, readJson } from '@/lib/http';
import { clearKey, isLimited, recordFailure } from '@/lib/ratelimit';
import { dummyHash, verifyPassword } from '@/lib/password';
import { createSession, sessionCookie } from '@/lib/session';
import { getDb } from '@/lib/db';
import { classes, users } from '@/lib/db/schema';
import { normalizeClassCode } from '@/lib/classes';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const body = z.object({
  classCode: z.string().trim().min(1, '請輸入班級代碼').max(20),
  nickname: z.string().trim().min(1, '請輸入暱稱').max(30),
  password: z.string().min(1, '請輸入密碼').max(256),
});

export const POST = api(async (req) => {
  const { classCode, nickname, password } = await readJson(req, body);
  const code = normalizeClassCode(classCode);
  const ip = clientIp(req);
  const acctKey = `slogin:acct:${code}:${nickname.toLowerCase()}:${ip ?? '-'}`;
  const classKey = `slogin:class:${code}`;
  // 同一個帳號連錯 8 次鎖 15 分鐘；整個班一小時內失敗超過 60 次才暫停（一班學生同時登入不會互相影響）
  if (isLimited(acctKey, 8) || isLimited(classKey, 60)) throw new HttpError(429, '嘗試次數過多，請 15 分鐘後再試，或請老師重設密碼');

  const cls = getDb().select().from(classes).where(eq(classes.joinCode, code)).get();
  const student = cls && !cls.archived
    ? getDb().select().from(users).where(eq(users.classId, cls.id)).all().find((u) => u.role === 'student' && u.nickname?.toLowerCase() === nickname.toLowerCase())
    : undefined;
  const valid = await verifyPassword(student?.passwordHash ?? (await dummyHash()), password);
  if (!student || !valid) {
    recordFailure(acctKey, 900);
    recordFailure(classKey, 3600);
    audit({ actorId: student?.id, action: 'login.fail', target: `student:${code}:${nickname}`, ip });
    throw new HttpError(401, '班級代碼、暱稱或密碼不正確');
  }
  if (student.status === 'disabled') throw new HttpError(403, '此帳號已停用，請聯絡老師');
  if (student.status === 'pending') throw new HttpError(403, '你的申請正在等待老師批准');

  clearKey(acctKey);
  getDb().update(users).set({ lastLoginAt: Date.now() }).where(eq(users.id, student.id)).run();
  const { token, maxAgeSec } = createSession(student.id, 'student', { ip, userAgent: req.headers.get('user-agent') });
  audit({ actorId: student.id, action: 'login.success', ip });
  const res = NextResponse.json({ ok: true, role: 'student', mustChangePassword: student.mustChangePassword });
  res.cookies.set(sessionCookie(token, maxAgeSec, isSecureRequest(req)));
  return res;
});
