import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { pageUser } from '@/lib/pageAuth';
import { getDb } from '@/lib/db';
import { classes, parentLinks, users } from '@/lib/db/schema';
import { parentWeeklyReport, studentSummary } from '@/lib/stats';
import { findUnit } from '@/lib/content/registry';
import { noticesFor } from '@/lib/broadcast';
import { Notices } from '@/components/Notices';
import { Bar, Card, Empty, Stat, Table, ago, hk, pct } from '@/components/kit';
import { BindForm } from './BindForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: '家長專區' };

const KIND = { practice: '自由練習', assignment: '功課', redo: '錯題重做', review: '間隔複習', paper: '試卷' } as Record<string, string>;

/** 單一孩子的只讀週報：純查詢，不寫入任何資料、不顯示題目或答案 */
function WeeklyReport({ studentId, name }: { studentId: string; name: string }) {
  const r = parentWeeklyReport(studentId);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="近 7 日作答" value={`${r.answered} 題`} />
        <Stat label="近 7 日正確率" value={pct(r.accuracy)} />
        <Stat label="連續練習日數" value={`${r.streak} 日`} />
      </div>

      <div>
        <h4 className="mb-2 font-semibold">各科正確率（累計）</h4>
        <Table head={['科目', '作答', '正確率']}>
          {r.subjects.map((s) => (
            <tr key={s.subject}>
              <td className="font-semibold">{s.label}</td>
              <td className="tabular-nums">{s.answered} 題</td>
              <td><Bar value={s.accuracy} /></td>
            </tr>
          ))}
        </Table>
        <p className="mt-2 text-xs text-ink-soft">正確率以文字百分比顯示，色條只作輔助；沒有作答的科目顯示「—」。</p>
      </div>

      <div>
        <h4 className="mb-2 font-semibold">最近 5 次練習</h4>
        {r.recent.length === 0 ? (
          <Empty>{name}還沒有練習記錄。</Empty>
        ) : (
          <Table head={['時間', '類型', '單元', '成績']}>
            {r.recent.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap">{hk(a.startedAt)}</td>
                <td>{KIND[a.kind] ?? a.kind}</td>
                <td>{findUnit(a.unitId)?.title ?? (a.unitId === 'review' ? '間隔複習' : a.unitId)}</td>
                <td className="tabular-nums">{a.finishedAt ? `${a.correct} / ${a.total}` : '未完成'}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}

export default async function ParentHome() {
  const me = await pageUser(['parent']);
  const db = getDb();
  const kids = db.select({ s: users, c: classes }).from(parentLinks).innerJoin(users, eq(users.id, parentLinks.studentId)).leftJoin(classes, eq(classes.id, users.classId)).where(eq(parentLinks.parentId, me.id)).all();
  return (
    <>
      <Notices items={noticesFor(me.id).filter((n) => !n.readAt)} />
      <h1 className="text-2xl font-bold">孩子的學習</h1>
      {kids.length === 0 ? (
        <Empty>還沒有綁定孩子。請向老師索取「家長綁定碼」，在下面輸入。</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {kids.map(({ s, c }) => {
            const sum = studentSummary(s.id);
            return (
              <li key={s.id}>
                <Link href={`/parent/child/${s.id}`} className="block rounded-xl border-2 border-line bg-white p-4 hover:border-ballpoint">
                  <p className="text-lg font-bold">{s.nickname}</p>
                  <p className="text-sm text-ink-soft">{c ? `${c.name} · P${c.grade}` : ''}</p>
                  <p className="mt-2 text-sm">近 7 日作答 <b>{sum.weekAnswered}</b> 題 · 正確率 <b>{pct(sum.weekAccuracy)}</b></p>
                  <p className="text-sm text-ink-soft">最後練習：{ago(sum.lastActive)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {kids.length > 0 && (
        <Card title="本週學習週報（只讀）">
          <p className="mb-4 text-sm text-ink-soft">以下為近 7 日的學習概況，僅供查看：不會改動任何資料，亦不會顯示題目或答案。</p>
          <div className="space-y-8">
            {kids.map(({ s }) => (
              <section key={s.id} className="space-y-3">
                <h3 className="text-lg font-bold">{s.nickname ?? '孩子'}</h3>
                <WeeklyReport studentId={s.id} name={s.nickname ?? '孩子'} />
              </section>
            ))}
          </div>
        </Card>
      )}

      <Card title="綁定孩子"><BindForm /></Card>
    </>
  );
}
