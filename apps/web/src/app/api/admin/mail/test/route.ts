import { api, HttpError, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { orgName, readConfig, sendMail, writeConfig, MailError } from '@/lib/mail';
import { testMail } from '@/lib/mail/templates';
import { assertRate } from '@/lib/ratelimit';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** 測試郵件只會發到管理員自己登記的電郵，不接受任意收件人，避免被濫用 */
export const POST = api(async () => {
  const me = await requireUser(['admin']);
  assertRate(`mail-test:${me.id}`, 10, 3600);
  const cfg = readConfig();
  if (!cfg) throw new HttpError(400, '請先儲存郵件設定');
  const row = getDb().select().from(users).where(eq(users.id, me.id)).get();
  if (!row?.email) throw new HttpError(400, '管理員帳號沒有登記電郵');
  try {
    await sendMail({ to: row.email, purpose: 'test', ...testMail(orgName()) }, { skipReadyCheck: true });
  } catch (e) {
    if (e instanceof MailError) throw new HttpError(400, `發送失敗：${e.message}`);
    throw e;
  }
  writeConfig({ ...cfg, verifiedAt: Date.now(), enabled: true });
  audit({ actorId: me.id, action: 'mail.test_ok' });
  return ok({ sentTo: row.email });
});
