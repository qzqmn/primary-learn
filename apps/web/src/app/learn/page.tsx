import Link from 'next/link';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { pageUser } from '@/lib/pageAuth';
import { getDb } from '@/lib/db';
import { assignments, attempts, classes, users } from '@/lib/db/schema';
import { allUnits, findUnit } from '@/lib/content/registry';
import { SUBJECT_LABEL, type Subject } from '@/lib/content/types';
import { streakDays, unitProgress } from '@/lib/stats';
import { countDue } from '@/lib/srs';
import { noticesFor } from '@/lib/broadcast';
import { Card, Stars, hk } from '@/components/kit';
import { Notices } from '@/components/Notices';

export const dynamic = 'force-dynamic';
export const metadata = { title: '我的學習' };

export default async function LearnHome({ searchParams }: { searchParams: Promise<{ s?: string; g?: string }> }) {
  const me = await pageUser(['student']);
  const sp = await searchParams;
  const db = getDb();
  const row = db.select().from(users).where(eq(users.id, me.id)).get();
  const cls = row?.classId ? db.select().from(classes).where(eq(classes.id, row.classId)).get() : undefined;
  const subject = (['math', 'english', 'chinese', 'general'].includes(sp.s ?? '') ? sp.s : 'math') as Subject;
  const grade = Math.min(6, Math.max(1, Number(sp.g) || cls?.grade || 1));
  const progress = unitProgress(me.id);
  const units = allUnits().filter((u) => u.subject === subject && u.grade === grade);
  const streak = streakDays(me.id);
  const due = countDue(me.id);

  const asg = cls ? db.select().from(assignments).where(eq(assignments.classId, cls.id)).orderBy(desc(assignments.createdAt)).limit(10).all() : [];
  const done = new Set(
    db.select({ a: attempts.assignmentId }).from(attempts).where(and(eq(attempts.userId, me.id), isNotNull(attempts.assignmentId), isNotNull(attempts.finishedAt))).all().map((r) => r.a),
  );
  const todo = asg.filter((a) => !done.has(a.id));
  const q = (s: string, g: number) => `/learn?s=${s}&g=${g}`;

  return (
    <>
      <Notices items={noticesFor(me.id).filter((n) => !n.readAt)} />
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">你好，{me.displayName}！</h1>
          <p className="text-ink-soft">{cls ? `${cls.name}` : ''}</p>
        </div>
        {streak > 0 && <p className="rounded-full bg-hi px-3 py-1 text-sm font-bold">🔥 連續 {streak} 日</p>}
      </div>

      <Card
        title={`今日複習 ${due} 題`}
        action={<Link href="/learn/review" className="rounded-lg bg-ballpoint px-3 py-1.5 text-sm font-semibold text-white hover:bg-ballpoint-dark">開始複習 →</Link>}
      >
        <p className="text-sm text-ink-soft">
          間隔重複（SRS）會把答錯的題目排入複習日程：答對就逐步拉長間隔，答錯就隔天再練。
          {due > 0 ? `目前有 ${due} 題到期，趁記憶猶新把它們清掉吧！` : '目前沒有到期題目，保持得很好！'}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
          <Link href="/learn/heatmap" className="text-ballpoint underline underline-offset-2">4 科 × P1–P6 學習熱圖 →</Link>
          <Link href="/learn/papers" className="text-ballpoint underline underline-offset-2">試卷 →</Link>
          <Link href="/learn/badges" className="text-ballpoint underline underline-offset-2">我的徽章 →</Link>
          <Link href="/learn/mistakes" className="text-ballpoint underline underline-offset-2">錯題本 →</Link>
        </div>
      </Card>

      {todo.length > 0 && (
        <Card title="老師派的功課">
          <ul className="space-y-2">
            {todo.map((a) => (
              <li key={a.id}>
                <Link href={a.mode === 'fixed' && a.paperId ? `/learn/papers?a=${a.id}` : `/learn/unit/${a.unitId}?a=${a.id}`} className="flex items-center justify-between gap-3 rounded-lg border-2 border-line px-3 py-3 hover:border-ballpoint">
                  <span>
                    <span className="block font-semibold">{a.title}{a.mode === 'fixed' && <span className="ml-2 rounded-full bg-hi px-2 py-0.5 align-middle text-xs">固定卷</span>}</span>
                    <span className="text-sm text-ink-soft">{a.mode === 'fixed' ? '固定卷面 · 題序與配分固定' : findUnit(a.unitId)?.title} · {a.count} 題{a.timeLimitMin ? ` · 時限 ${a.timeLimitMin} 分鐘` : ''}{a.dueAt ? ` · 限期 ${hk(a.dueAt, false)}` : ''}</span>
                  </span>
                  <span className="font-bold text-ballpoint">開始</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="科目">
          {(Object.keys(SUBJECT_LABEL) as Subject[]).map((s) => (
            <Link key={s} href={q(s, grade)} role="tab" aria-selected={s === subject} className={`rounded-full border-2 px-4 py-1.5 font-semibold ${s === subject ? 'border-ballpoint bg-ballpoint text-white' : 'border-line bg-white'}`}>
              {SUBJECT_LABEL[s]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="年級">
          {[1, 2, 3, 4, 5, 6].map((g) => (
            <Link key={g} href={q(subject, g)} aria-current={g === grade ? 'true' : undefined} className={`rounded-lg border-2 px-3 py-1 text-sm font-semibold ${g === grade ? 'border-ballpoint bg-ballpoint-tint' : 'border-line bg-white'}`}>
              P{g}
            </Link>
          ))}
        </div>
      </div>

      {units.length === 0 ? (
        <p className="rounded-xl bg-paper px-4 py-8 text-center text-ink-soft">P{grade} {SUBJECT_LABEL[subject]}暫時未有練習，試試其他年級。</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {units.map((u) => {
            const p = progress.get(u.id);
            return (
              <li key={u.id}>
                <Link href={`/learn/unit/${u.id}`} className="block h-full rounded-xl border-2 border-line bg-white p-4 hover:border-ballpoint">
                  <p className="font-bold">{u.title}</p>
                  <div className="mt-2 flex items-center justify-between text-sm text-ink-soft">
                    <Stars n={p?.stars ?? 0} />
                    <span>{p ? `最近 ${p.answered} 題 · 正確 ${Math.round(p.accuracy * 100)}%` : '未開始'}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
