import { z } from 'zod';
import { NextResponse } from 'next/server';
import { api, clientIp, HttpError, isSecureRequest, readJson } from '@/lib/http';
import { assertRate } from '@/lib/ratelimit';
import { checkSetupToken, isSetupComplete } from '@/lib/setup';
import { checkPassword, checkUsername, isValidEmail, normalizeEmail, normalizeUsername } from '@/lib/validators';
import { hashPassword } from '@/lib/password';
import { getDb } from '@/lib/db';
import { recoveryCodes, users } from '@/lib/db/schema';
import { setSetting, deleteSetting } from '@/lib/settings';
import { hmac, randomGroups } from '@/lib/crypto';
import { createSession, sessionCookie } from '@/lib/session';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const TIMEZONES = ['Asia/Hong_Kong', 'Asia/Macau', 'Asia/Singapore', 'Asia/Taipei', 'UTC'];

const body = z.object({
  setupToken: z.string().max(64).optional(),
  orgName: z.string().trim().min(1, '請輸入機構名稱').max(60, '機構名稱不可超過 60 字'),
  timezone: z.string().refine((v) => TIMEZONES.includes(v), '時區不正確'),
  username: z.string().max(40),
  email: z.string().max(254),
  password: z.string().max(200),
});

export const POST = api(async (req) => {
  if (isSetupComplete()) throw new HttpError(404, 'Not found');
  assertRate('setup:submit', 10, 900, '嘗試次數過多，請 15 分鐘後再試');
  const b = await readJson(req, body);
  if (!checkSetupToken(b.setupToken)) throw new HttpError(400, '設定碼不正確。請在伺服器執行 docker compose logs app 查看');

  const usernameErr = checkUsername(b.username, true);
  if (usernameErr) throw new HttpError(400, usernameErr);
  const email = normalizeEmail(b.email);
  if (!isValidEmail(email)) throw new HttpError(400, '電郵格式不正確');
  const username = normalizeUsername(b.username);
  const pwErr = checkPassword(b.password, 'admin', { username, email });
  if (pwErr) throw new HttpError(400, pwErr);

  const passwordHash = await hashPassword(b.password);
  const id = crypto.randomUUID();
  const now = Date.now();
  const codes = Array.from({ length: 8 }, () => randomGroups(3, 4));

  // 同步事務：同一時間只有一個請求能建立管理員
  getDb().transaction((tx) => {
    if (isSetupComplete()) throw new HttpError(404, 'Not found');
    tx.insert(users).values({ id, username, email, displayName: username, role: 'admin', passwordHash, createdAt: now }).run();
    tx.insert(recoveryCodes).values(codes.map((c) => ({ userId: id, codeHash: hmac('recovery', c.replace(/-/g, '')) }))).run();
  });
  setSetting('org_name', b.orgName);
  setSetting('timezone', b.timezone);
  setSetting('setup_completed_at', String(now));
  deleteSetting('setup_token');

  const ip = clientIp(req);
  audit({ actorId: id, action: 'setup.complete', target: id, ip });
  const { token, maxAgeSec } = createSession(id, 'admin', { ip, userAgent: req.headers.get('user-agent') });
  const res = NextResponse.json({ ok: true, recoveryCodes: codes });
  res.cookies.set(sessionCookie(token, maxAgeSec, isSecureRequest(req)));
  return res;
});
