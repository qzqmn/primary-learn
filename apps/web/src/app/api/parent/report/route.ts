import { and, eq } from 'drizzle-orm';
import { api, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { parentLinks, users } from '@/lib/db/schema';
import { parentWeeklyReport } from '@/lib/stats';

export const dynamic = 'force-dynamic';

/** 家長只讀週報：僅回傳自己綁定學生的統計，不含任何題目或答案 */
export const GET = api(async (req) => {
  const u = await requireUser(['parent']);
  const studentId = req.nextUrl.searchParams.get('studentId');
  const cond = studentId
    ? and(eq(parentLinks.parentId, u.id), eq(parentLinks.studentId, studentId))
    : eq(parentLinks.parentId, u.id);
  const links = getDb()
    .select({ studentId: parentLinks.studentId, nickname: users.nickname })
    .from(parentLinks)
    .innerJoin(users, eq(users.id, parentLinks.studentId))
    .where(cond)
    .all();
  return ok({
    reports: links.map((l) => ({ studentId: l.studentId, nickname: l.nickname, ...parentWeeklyReport(l.studentId) })),
  });
});
