import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, clientIp, HttpError, ok, readJson } from '@/lib/http';
import { assertRate } from '@/lib/ratelimit';
import { getDb } from '@/lib/db';
import { pendingRegistrations, users } from '@/lib/db/schema';
import { checkPassword, checkUsername, isValidEmail, normalizeEmail, normalizeUsername } from '@/lib/validators';
import { hashPassword } from '@/lib/password';
import { isMailReady, orgName, sendMailBackground } from '@/lib/mail';
import { codeMail } from '@/lib/mail/templates';
import { issueOtp, OTP_TTL_MIN } from '@/lib/otp';
import { getSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const body = z.object({
  role: z.enum(['teacher', 'parent']),
  username: z.string().trim().max(30),
  email: z.string().trim().max(254),
  displayName: z.string().trim().min(1, '請輸入姓名或稱呼').max(30),
  password: z.string().max(128),
});

export const POST = api(async (req) => {
  const b = await readJson(req, body);
  if (!isMailReady()) throw new HttpError(503, '系統尚未啟用電郵功能，暫時不能自行註冊，請聯絡管理員');
  if (b.role === 'teacher' && (getSetting('teacher_signup') ?? 'approval') === 'closed') throw new HttpError(403, '老師帳號只由管理員建立，請聯絡管理員');
  if (b.role === 'parent' && getSetting('parent_signup') === 'off') throw new HttpError(403, '家長註冊暫未開放');
  const ip = clientIp(req);
  if (ip) assertRate(`reg:ip:${ip}`, 10, 3600);

  const username = normalizeUsername(b.username);
  const email = normalizeEmail(b.email);
  const ue = checkUsername(username);
  if (ue) throw new HttpError(400, ue);
  if (!isValidEmail(email)) throw new HttpError(400, '電郵格式不正確');
  const pe = checkPassword(b.password, b.role, { username, email });
  if (pe) throw new HttpError(400, pe);
  const db = getDb();
  if (db.select({ id: users.id }).from(users).where(eq(users.username, username)).get()) throw new HttpError(409, '此用戶名已被使用，請換一個');

  // 電郵已註冊時回應不變，避免被用來探測誰有帳號；已有帳號的人請用「忘記密碼」
  const emailTaken = !!db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (!emailTaken) {
    assertRate(`reg:email:${email}`, 5, 3600, '此電郵申請太頻繁，請稍後再試');
    const row = { email, role: b.role, username, displayName: b.displayName, passwordHash: await hashPassword(b.password), createdAt: Date.now() };
    db.insert(pendingRegistrations).values(row).onConflictDoUpdate({ target: pendingRegistrations.email, set: row }).run();
    const code = issueOtp(email, 'register');
    sendMailBackground({ to: email, purpose: 'register', ...codeMail({ org: orgName(), purpose: 'register', code, minutes: OTP_TTL_MIN }) });
  }
  return ok({ message: '如果這個電郵可以註冊，驗證碼已發送。已有帳號的話請改用「忘記密碼」。' });
});
