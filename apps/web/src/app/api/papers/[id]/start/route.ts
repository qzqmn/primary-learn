import { api, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { startPaperAttempt } from '@/lib/papers';

export const dynamic = 'force-dynamic';

/** 學生開卷：回傳格式比照 /api/learn/start，供既有 /api/learn/answer、/api/learn/finish 沿用 */
export const POST = api(async (req, ctx) => {
  const u = await requireUser(['student']);
  const { id } = await ctx.params;
  // 由老師指派的固定卷功課進入時會帶 assignmentId；一般自行練習則為空物件
  const raw = (await req.json().catch(() => ({}))) as { assignmentId?: unknown };
  const assignmentId = typeof raw?.assignmentId === 'string' && raw.assignmentId ? raw.assignmentId : undefined;
  return ok(startPaperAttempt(u, id, assignmentId));
});
