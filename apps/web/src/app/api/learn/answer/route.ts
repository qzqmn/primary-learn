import { z } from 'zod';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { answerQuestion } from '@/lib/practice';

export const dynamic = 'force-dynamic';
export const POST = api(async (req) => {
  const u = await requireUser(['student']);
  const b = await readJson(req, z.object({ attemptId: z.string().max(60), idx: z.number().int().min(0).max(100), answer: z.string().max(100), timeMs: z.number().optional() }));
  return ok(answerQuestion(u, b));
});
