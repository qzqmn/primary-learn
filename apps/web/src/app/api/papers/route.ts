import { randomUUID } from 'node:crypto';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { paperSchema, paperContentValues, visiblePapers, safePaper } from '@/lib/papers';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** 列表：依角色回傳可見試卷的安全 DTO（不含含答案的 questions） */
export const GET = api(async () => {
  const u = await requireUser();
  return ok({ papers: visiblePapers(u).map(safePaper) });
});

/** 建立試卷：一律為 pending，須管理員覆核；寫入前再跑一次合規閘 */
export const POST = api(async (req) => {
  const u = await requireUser(['admin', 'teacher']);
  const b = await readJson(req, paperSchema);
  const id = randomUUID();
  const values = paperContentValues(b, id);
  getDb().insert(papers).values({
    id,
    ownerId: u.id,
    status: 'pending',
    createdAt: Date.now(),
    ...values,
  }).run();
  audit({ actorId: u.id, action: 'paper.create', target: id, meta: { kind: b.kind, license: b.license ?? null, questionCount: b.questions.length, status: 'pending' } });
  return ok({ id });
});
