import { api } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getViewableStudent } from '@/lib/access';
import { getSqlite } from '@/lib/db';
import { findUnit } from '@/lib/content/registry';
import { csvResponse } from '@/lib/csv';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
/** 學生作答明細 CSV（老師、已綁定家長、學生本人、管理員可下載） */
export const GET = api(async (_req, ctx) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const { student } = getViewableStudent(u, id);
  const rows = getSqlite().prepare('SELECT ts, unit_id AS unitId, tag, correct, given, time_ms AS timeMs FROM attempt_answers WHERE user_id = ? ORDER BY ts DESC LIMIT 5000').all(id) as { ts: number; unitId: string; tag: string; correct: number; given: string; timeMs: number }[];
  const out: unknown[][] = [['時間', '單元', '知識點', '結果', '學生答案', '用時(秒)']];
  for (const r of rows) out.push([new Date(r.ts).toLocaleString('sv-SE', { timeZone: 'Asia/Hong_Kong' }), findUnit(r.unitId)?.title ?? r.unitId, r.tag, r.correct ? '對' : '錯', r.given, Math.round(r.timeMs / 1000)]);
  audit({ actorId: u.id, action: 'export.student', target: id });
  return csvResponse(`report-${student.nickname}.csv`, out);
});
