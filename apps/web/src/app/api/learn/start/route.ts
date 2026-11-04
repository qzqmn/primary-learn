import { z } from 'zod';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { startAttempt } from '@/lib/practice';

export const dynamic = 'force-dynamic';
export const POST = api(async (req) => {
  const u = await requireUser(['student']);
  const b = await readJson(req, z.object({ unitId: z.string().max(60), count: z.number().int().optional(), assignmentId: z.string().max(60).optional() }));
  return ok(startAttempt(u, b));
});
