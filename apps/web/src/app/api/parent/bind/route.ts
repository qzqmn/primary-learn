import { z } from 'zod';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { assertRate } from '@/lib/ratelimit';
import { getDb } from '@/lib/db';
import { bindCodes, parentLinks } from '@/lib/db/schema';
import { hmac, normalizeCode } from '@/lib/crypto';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const POST = api(async (req) => {
  const u = await requireUser(['parent']);
  assertRate(`bind:${u.id}`, 10, 3600, '嘗試次數過多，請 1 小時後再試');
  const { code } = await readJson(req, z.object({ code: z.string().trim().min(4).max(20) }));
  const db = getDb();
  const row = db.select().from(bindCodes).where(and(eq(bindCodes.codeHash, hmac('bind', normalizeCode(code))), isNull(bindCodes.usedAt), gt(bindCodes.expiresAt, Date.now()))).get();
  if (!row) throw new HttpError(400, '綁定碼不正確或已過期，請向老師重新索取');
  db.transaction((tx) => {
    tx.update(bindCodes).set({ usedAt: Date.now() }).where(eq(bindCodes.id, row.id)).run();
    tx.insert(parentLinks).values({ parentId: u.id, studentId: row.studentId, createdAt: Date.now() }).onConflictDoNothing().run();
  });
  audit({ actorId: u.id, action: 'parent.bind', target: row.studentId });
  return ok();
});
