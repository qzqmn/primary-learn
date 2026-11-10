import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { assignments, attempts, papers } from '@/lib/db/schema';
import { finishAttempt } from '@/lib/practice';
import { awardBadges } from '@/lib/badges';

export const dynamic = 'force-dynamic';
export const POST = api(async (req) => {
  const u = await requireUser(['student']);
  const { attemptId } = await readJson(req, z.object({ attemptId: z.string().max(60) }));
  const result = finishAttempt(u, attemptId);
  // 徽章屬附帶效果：計算失敗也不影響原本的完成結果與回傳格式
  try {
    awardBadges(u.id);
  } catch (e) {
    console.error('[badges]', e);
  }

  // 固定卷面：依「每題配分」換算分數。指派功課的配分優先於試卷本身的預設值。
  let scoring: Record<string, number> = {};
  try {
    const db = getDb();
    const a = db.select().from(attempts).where(eq(attempts.id, attemptId)).get();
    if (a?.kind === 'paper' && a.unitId.startsWith('paper:')) {
      const p = db.select().from(papers).where(eq(papers.id, a.unitId.slice(6))).get();
      const asg = a.assignmentId ? db.select().from(assignments).where(eq(assignments.id, a.assignmentId)).get() : undefined;
      const ppq = asg?.pointsPerQuestion ?? p?.pointsPerQuestion ?? 10;
      scoring = { score: result.correct * ppq, maxScore: result.total * ppq, pointsPerQuestion: ppq };
    }
  } catch (e) {
    console.error('[paper scoring]', e);
  }
  return ok({ ...result, ...scoring });
});
