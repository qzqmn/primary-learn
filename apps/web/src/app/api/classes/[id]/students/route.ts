import { z } from 'zod';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getManagedClass } from '@/lib/access';
import { createStudent, importStudents } from '@/lib/classes';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
/** 新增單一學生（nickname）或批量匯入（csv）；回傳初始密碼，只在此刻顯示一次 */
export const POST = api(async (req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const { id } = await ctx.params;
  getManagedClass(u, id);
  const b = await readJson(req, z.object({ nickname: z.string().max(30).optional(), note: z.string().max(60).optional(), csv: z.string().max(20000).optional() }));
  if (b.csv) {
    const r = await importStudents(id, b.csv);
    audit({ actorId: u.id, action: 'student.import', target: id, meta: { created: r.created.length, failed: r.failed.length } });
    return ok(r);
  }
  const s = await createStudent(id, b.nickname ?? '', { note: b.note });
  audit({ actorId: u.id, action: 'student.create', target: s.id });
  return ok({ created: [{ nickname: s.nickname, password: s.password, note: b.note }], failed: [] });
});
