import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getManagedClass } from '@/lib/access';
import { getDb } from '@/lib/db';
import { assignments, papers } from '@/lib/db/schema';
import { findUnit } from '@/lib/content/registry';
import type { ServerQuestion } from '@/lib/content/types';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  mode: z.enum(['random', 'fixed']).default('random'),
  unitId: z.string().max(60).optional(),
  count: z.coerce.number().int().min(5).max(20).optional(),
  paperId: z.string().max(60).optional(),
  title: z.string().trim().max(40).optional(),
  dueAt: z.number().int().nullable().optional(),
  timeLimitMin: z.number().int().min(1).max(300).nullable().optional(),
  pointsPerQuestion: z.number().int().min(1).max(100).optional(),
});

export const POST = api(async (req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const { id } = await ctx.params;
  getManagedClass(u, id);
  const b = await readJson(req, bodySchema);
  const db = getDb();
  const aid = randomUUID();

  if (b.mode === 'fixed') {
    // B3 固定卷面：必須指向一張 approved、含題目的非索引卷
    if (!b.paperId) throw new HttpError(400, '固定卷面必須指定一張試卷');
    const p = db.select().from(papers).where(eq(papers.id, b.paperId)).get();
    if (!p || p.status !== 'approved') throw new HttpError(400, '找不到已審核通過的試卷');
    if (p.kind === 'index') throw new HttpError(400, '索引卷只提供外連、沒有題目，不能派成功課');
    let qs: ServerQuestion[] = [];
    try { qs = JSON.parse(p.questions) as ServerQuestion[]; } catch { /* 空 */ }
    if (!qs.length) throw new HttpError(400, '這張試卷沒有題目，不能派發');
    db.insert(assignments).values({
      id: aid,
      classId: id,
      title: b.title || p.title,
      unitId: `paper:${p.id}`,
      count: qs.length,
      dueAt: b.dueAt ?? null,
      createdBy: u.id,
      createdAt: Date.now(),
      mode: 'fixed',
      paperId: p.id,
      timeLimitMin: b.timeLimitMin ?? p.timeLimitMin ?? null,
      pointsPerQuestion: b.pointsPerQuestion ?? p.pointsPerQuestion ?? 10,
    }).run();
  } else {
    // 原本的隨機抽題行為
    if (!b.unitId || !b.count) throw new HttpError(400, '請選擇單元與題數');
    const unit = findUnit(b.unitId);
    if (!unit) throw new HttpError(404, '找不到此單元');
    db.insert(assignments).values({
      id: aid,
      classId: id,
      title: b.title || unit.title,
      unitId: unit.id,
      count: b.count,
      dueAt: b.dueAt ?? null,
      createdBy: u.id,
      createdAt: Date.now(),
      mode: 'random',
      paperId: null,
      timeLimitMin: null,
      pointsPerQuestion: 10,
    }).run();
  }

  audit({ actorId: u.id, action: 'assignment.create', target: aid, meta: { mode: b.mode, paperId: b.paperId ?? null } });
  return ok({ id: aid });
});
