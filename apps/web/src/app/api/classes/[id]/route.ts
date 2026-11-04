import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getManagedClass } from '@/lib/access';
import { getDb } from '@/lib/db';
import { classes } from '@/lib/db/schema';
import { newJoinCode } from '@/lib/classes';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const PATCH = api(async (req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const { id } = await ctx.params;
  getManagedClass(u, id);
  const b = await readJson(req, z.object({ name: z.string().trim().min(1).max(20).optional(), joinMode: z.enum(['closed', 'approval', 'auto']).optional(), archived: z.boolean().optional(), regenerateCode: z.boolean().optional() }));
  const set: Partial<typeof classes.$inferInsert> = {};
  if (b.name) set.name = b.name;
  if (b.joinMode) set.joinMode = b.joinMode;
  if (b.archived !== undefined) set.archived = b.archived;
  if (b.regenerateCode) set.joinCode = newJoinCode();
  if (Object.keys(set).length) getDb().update(classes).set(set).where(eq(classes.id, id)).run();
  audit({ actorId: u.id, action: 'class.update', target: id, meta: { ...b } });
  return ok();
});
