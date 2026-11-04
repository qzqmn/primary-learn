import { z } from 'zod';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { finishAttempt } from '@/lib/practice';

export const dynamic = 'force-dynamic';
export const POST = api(async (req) => {
  const u = await requireUser(['student']);
  const { attemptId } = await readJson(req, z.object({ attemptId: z.string().max(60) }));
  return ok(finishAttempt(u, attemptId));
});
