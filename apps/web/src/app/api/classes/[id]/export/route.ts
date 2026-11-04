import { api } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getManagedClass } from '@/lib/access';
import { classOverview } from '@/lib/stats';
import { csvResponse } from '@/lib/csv';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const GET = api(async (_req, ctx) => {
  const u = await requireUser(['admin', 'teacher']);
  const { id } = await ctx.params;
  const cls = getManagedClass(u, id);
  const fmt = (t: number | null) => (t ? new Date(t).toLocaleString('sv-SE', { timeZone: 'Asia/Hong_Kong' }) : '');
  const rows: unknown[][] = [['暱稱', '備註', '狀態', '作答題數', '答對題數', '正確率%', '近7日作答', '最後練習', '未解決錯題']];
  for (const s of classOverview(id)) rows.push([s.nickname, s.note, s.status, s.answered, s.correct, s.answered ? Math.round((s.correct / s.answered) * 100) : '', s.weekAnswered, fmt(s.lastActive), s.openMistakes]);
  audit({ actorId: u.id, action: 'export.class', target: id });
  return csvResponse(`class-${cls.name}.csv`, rows);
});
