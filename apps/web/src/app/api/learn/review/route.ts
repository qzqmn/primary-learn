import { randomUUID } from 'node:crypto';
import { HttpError, api, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { countDue, dueCards } from '@/lib/srs';
import { toClient } from '@/lib/content/engine';
import type { ServerQuestion } from '@/lib/content/types';
import { getDb } from '@/lib/db';
import { attempts } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/** 回到期卡片數 */
export const GET = api(async () => {
  const u = await requireUser(['student']);
  return ok({ due: countDue(u.id) });
});

/** 開一份 review 練習：題目來自到期的 srsCards，沿用既有 /api/learn/answer 與 /api/learn/finish 流程 */
export const POST = api(async () => {
  const u = await requireUser(['student']);
  const cards = dueCards(u.id, 10);
  if (!cards.length) throw new HttpError(404, '今日沒有到期需要複習的題目，明天再來吧！');
  const qs = cards.map((c) => JSON.parse(c.question) as ServerQuestion);
  const id = randomUUID();
  getDb()
    .insert(attempts)
    .values({
      id,
      userId: u.id,
      kind: 'review',
      unitId: 'review',
      questions: JSON.stringify(qs),
      total: qs.length,
      startedAt: Date.now(),
    })
    .run();
  return ok({ attemptId: id, kind: 'review', unit: { id: 'review', title: '間隔複習' }, questions: qs.map(toClient) });
});
