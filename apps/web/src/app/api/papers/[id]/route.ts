import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { paperSchema, paperContentValues } from '@/lib/papers';
import { audit } from '@/lib/audit';
import type { SessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

function find(id: string) {
  const row = getDb().select().from(papers).where(eq(papers.id, id)).get();
  if (!row) throw new HttpError(404, '找不到此試卷');
  return row;
}

/** 只有管理員或試卷擁有者可以操作 */
function assertOwnerOrAdmin(user: SessionUser, ownerId: string) {
  if (user.role !== 'admin' && ownerId !== user.id) throw new HttpError(403, '只有管理員或試卷擁有者可以操作此試卷');
}

/** 擁有者／管理員讀取完整試卷（含題目，供編輯）；學生不在授權範圍 */
export const GET = api(async (_req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const row = find((await ctx.params).id);
  assertOwnerOrAdmin(u, row.ownerId);
  return ok({ paper: row });
});

/** 整份更新：重新驗證合規並還原為 pending，避免已通過的卷被偷改後直接對學生生效 */
export const PATCH = api(async (req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const row = find((await ctx.params).id);
  assertOwnerOrAdmin(u, row.ownerId);
  const b = await readJson(req, paperSchema);
  const values = paperContentValues(b, row.id);
  getDb().update(papers).set({
    ...values,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  }).where(eq(papers.id, row.id)).run();
  audit({ actorId: u.id, action: 'paper.update', target: row.id, meta: { status: 'pending', kind: b.kind } });
  return ok();
});

export const DELETE = api(async (_req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const row = find((await ctx.params).id);
  assertOwnerOrAdmin(u, row.ownerId);
  getDb().delete(papers).where(eq(papers.id, row.id)).run();
  audit({ actorId: u.id, action: 'paper.delete', target: row.id });
  return ok();
});
