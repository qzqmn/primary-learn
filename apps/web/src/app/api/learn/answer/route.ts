import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { answerQuestion } from '@/lib/practice';
import { syncFromMistake } from '@/lib/srs';
import { getDb } from '@/lib/db';
import { attempts } from '@/lib/db/schema';
import type { ServerQuestion } from '@/lib/content/types';

export const dynamic = 'force-dynamic';
export const POST = api(async (req) => {
  const u = await requireUser(['student']);
  const b = await readJson(req, z.object({ attemptId: z.string().max(60), idx: z.number().int().min(0).max(100), answer: z.string().max(100), timeMs: z.number().optional() }));
  const r = answerQuestion(u, b);
  // 批改成功後同步間隔重複卡片。answerQuestion 只回傳批改結果，題目本體要從 attempts.questions JSON 取回；
  // 取不到題目或同步失敗都靜略跳過，不讓原本的批改流程失敗。
  if (!r.repeated) {
    try {
      const a = getDb().select().from(attempts).where(eq(attempts.id, b.attemptId)).get();
      const qs = a ? (JSON.parse(a.questions) as ServerQuestion[]) : [];
      const q = qs[b.idx];
      if (q) syncFromMistake(u.id, q, r.correct);
    } catch {
      /* 靜略：SRS 同步不應讓批改失敗 */
    }
  }
  return ok(r);
});
