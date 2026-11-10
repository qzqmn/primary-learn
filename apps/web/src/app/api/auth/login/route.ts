import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { api, clientIp, HttpError, isSecureRequest, ok, readJson } from '@/lib/http';
import { clearKey, isLimited, recordFailure } from '@/lib/ratelimit';
import { findUserByIdentifier, normalizeIdentifier } from '@/lib/users';
import { dummyHash, verifyPassword } from '@/lib/password';
import { createSession, getCurrentUser, sessionCookie } from '@/lib/session';
import { getDb } from '@/lib/db';
import { totpSecrets, users } from '@/lib/db/schema';
import { verifyTotp } from '@/lib/totp';
import { isSetupComplete } from '@/lib/setup';
import { isMailReady } from '@/lib/mail';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** 供登入頁在客戶端保留原本的「設定未完成／已登入」導向與註冊連結開關 */
export const GET = api(async () => {
  return ok({
    setupComplete: isSetupComplete(),
    signedIn: !!(await getCurrentUser()),
    canRegister: isMailReady(),
  });
});

const body = z.object({
  identifier: z.string().trim().min(1, '請輸入用戶名或電郵').max(254),
  password: z.string().min(1, '請輸入密碼').max(256),
  /** 已啟用 TOTP 的帳號必須帶此欄位；未帶時回 403 要求第二步驟 */
  totp: z.string().trim().max(10).optional(),
});

export const POST = api(async (req) => {
  const { identifier, password, totp } = await readJson(req, body);
  const ip = clientIp(req);
  const ident = normalizeIdentifier(identifier);
  const acctKey = `login:acct:${ident}:${ip ?? '-'}`;
  const identKey = `login:ident:${ident}`;
  // 按「帳號＋IP」限流，學校多人共用出口 IP 時不會整班被鎖
  if (isLimited(acctKey, 8) || isLimited(identKey, 30)) throw new HttpError(429, '嘗試次數過多，請 15 分鐘後再試');

  const user = findUserByIdentifier(identifier);
  const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash()), password);
  if (!user || !valid) {
    recordFailure(acctKey, 900);
    recordFailure(identKey, 3600);
    audit({ actorId: user?.id, action: 'login.fail', target: ident, ip });
    throw new HttpError(401, '用戶名或密碼不正確');
  }
  if (user.status === 'disabled') throw new HttpError(403, '此帳號已停用，請聯絡管理員');
  if (user.status === 'pending') throw new HttpError(403, '帳號正在等待管理員審批，批准後即可登入');

  // 二步驗證：密碼正確後才檢查，避免讓攻擊者探測誰啟用了 TOTP
  const secretRow = getDb().select().from(totpSecrets).where(eq(totpSecrets.userId, user.id)).get();
  if (secretRow?.enabledAt) {
    if (!totp) {
      audit({ actorId: user.id, action: 'login.totp_required', target: ident, ip });
      throw new HttpError(403, '此帳號已啟用二步驗證，請在下方輸入驗證應用程式上的 6 位驗證碼', 'totp_required');
    }
    if (!verifyTotp(secretRow.secret, totp)) {
      recordFailure(acctKey, 900);
      recordFailure(identKey, 3600);
      audit({ actorId: user.id, action: 'login.totp_fail', target: ident, ip });
      throw new HttpError(401, '驗證碼不正確或已過期，請重試');
    }
  }

  clearKey(acctKey);
  getDb().update(users).set({ lastLoginAt: Date.now() }).where(eq(users.id, user.id)).run();
  const { token, maxAgeSec } = createSession(user.id, user.role, { ip, userAgent: req.headers.get('user-agent') });
  audit({ actorId: user.id, action: 'login.success', ip });
  const res = NextResponse.json({ ok: true, role: user.role, mustChangePassword: user.mustChangePassword });
  res.cookies.set(sessionCookie(token, maxAgeSec, isSecureRequest(req)));
  return res;
});
