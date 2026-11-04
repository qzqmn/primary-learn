import { z } from 'zod';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { markNoticesRead } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';
export const POST = api(async (req) => {
  const u = await requireUser();
  const { ids } = await readJson(req, z.object({ ids: z.array(z.string().max(60)).max(100).optional() }));
  markNoticesRead(u.id, ids);
  return ok();
});
