import { randomUUID } from 'node:crypto';
import { api, HttpError, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getManagedClass, getViewableStudent } from '@/lib/access';
import { getDb } from '@/lib/db';
import { bindCodes } from '@/lib/db/schema';
import { hmac, normalizeCode, randomGroups } from '@/lib/crypto';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
/** 老師產生家長綁定碼：7 天內有效、只能用一次 */
export const POST = api(async (_req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const { id } = await ctx.params;
  const { cls } = getViewableStudent(u, id);
  if (!cls) throw new HttpError(404, '找不到學生所屬班級');
  getManagedClass(u, cls.id);
  const code = randomGroups(2, 4);
  getDb().insert(bindCodes).values({ id: randomUUID(), studentId: id, codeHash: hmac('bind', normalizeCode(code)), expiresAt: Date.now() + 7 * 86_400_000, createdBy: u.id }).run();
  audit({ actorId: u.id, action: 'bindcode.create', target: id });
  return ok({ code });
});
