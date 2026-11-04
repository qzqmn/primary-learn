import { eq } from 'drizzle-orm';
import { api, HttpError, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getManagedClass } from '@/lib/access';
import { getDb } from '@/lib/db';
import { assignments } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';
export const DELETE = api(async (_req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const { id } = await ctx.params;
  const a = getDb().select().from(assignments).where(eq(assignments.id, id)).get();
  if (!a) throw new HttpError(404, '找不到此功課');
  getManagedClass(u, a.classId);
  getDb().delete(assignments).where(eq(assignments.id, id)).run();
  return ok();
});
