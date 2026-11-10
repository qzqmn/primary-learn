import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, clientIp, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { totpSecrets } from '@/lib/db/schema';
import { generateSecret, otpauthUrl, verifyTotp } from '@/lib/totp';
import { assertRate } from '@/lib/ratelimit';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** 取得設定狀態；未啟用時若尚無密鑰就產生一組，並回傳 otpauth:// URL（明文只在此步驟出現） */
export const GET = api(async (req) => {
  const me = await requireUser(['admin', 'teacher']);
  const ip = clientIp(req);
  const db = getDb();
  const row = db.select().from(totpSecrets).where(eq(totpSecrets.userId, me.id)).get();
  audit({ actorId: me.id, action: 'totp.setup_viewed', ip });
  if (row?.enabledAt) return ok({ enabled: true, enabledAt: row.enabledAt });

  const secret = row?.secret ?? generateSecret();
  if (!row) db.insert(totpSecrets).values({ userId: me.id, secret, createdAt: Date.now() }).run();
  const account = me.username ?? me.email ?? me.displayName;
  return ok({ enabled: false, secret, otpauthUrl: otpauthUrl(secret, account) });
});

const body = z.object({ code: z.string().trim().regex(/^\d{6}$/, '請輸入 6 位數字驗證碼') });

/** 以驗證應用程式顯示的 6 位數啟用二步驗證 */
export const POST = api(async (req) => {
  const me = await requireUser(['admin', 'teacher']);
  const ip = clientIp(req);
  assertRate(`totp:verify:${me.id}`, 10, 600, '嘗試次數過多，請稍後再試');
  const { code } = await readJson(req, body);
  const db = getDb();
  const row = db.select().from(totpSecrets).where(eq(totpSecrets.userId, me.id)).get();
  if (!row) throw new HttpError(400, '尚未產生設定密鑰，請重新載入本頁');
  if (!verifyTotp(row.secret, code)) {
    audit({ actorId: me.id, action: 'totp.verify_fail', ip });
    throw new HttpError(400, '驗證碼不正確或已過期，請確認手機時間與系統時間一致後重試');
  }
  db.update(totpSecrets).set({ enabledAt: Date.now() }).where(eq(totpSecrets.userId, me.id)).run();
  audit({ actorId: me.id, action: 'totp.enabled', ip });
  return ok({ enabled: true });
});

/** 停用：直接刪除密鑰，下次設定會產生全新的密鑰，舊驗證碼立即失效 */
export const DELETE = api(async (req) => {
  const me = await requireUser(['admin', 'teacher']);
  const ip = clientIp(req);
  getDb().delete(totpSecrets).where(eq(totpSecrets.userId, me.id)).run();
  audit({ actorId: me.id, action: 'totp.disabled', ip });
  return ok({ enabled: false });
});
