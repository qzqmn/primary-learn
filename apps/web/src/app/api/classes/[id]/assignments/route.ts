import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getManagedClass } from '@/lib/access';
import { getDb } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
import { findUnit } from '@/lib/content/registry';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const POST = api(async (req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const { id } = await ctx.params;
  getManagedClass(u, id);
  const b = await readJson(req, z.object({ unitId: z.string().max(60), count: z.number().int().min(5).max(20), title: z.string().trim().max(40).optional(), dueAt: z.number().int().nullable().optional() }));
  const unit = findUnit(b.unitId);
  if (!unit) throw new HttpError(404, '找不到此單元');
  const aid = randomUUID();
  getDb().insert(assignments).values({ id: aid, classId: id, title: b.title || unit.title, unitId: unit.id, count: b.count, dueAt: b.dueAt ?? null, createdBy: u.id, createdAt: Date.now() }).run();
  audit({ actorId: u.id, action: 'assignment.create', target: aid });
  return ok({ id: aid });
});
