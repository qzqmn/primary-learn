import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { pageUser } from '@/lib/pageAuth';
import { getDb } from '@/lib/db';
import { classes, parentLinks, users } from '@/lib/db/schema';
import { studentSummary } from '@/lib/stats';
import { noticesFor } from '@/lib/broadcast';
import { Notices } from '@/components/Notices';
import { Card, Empty, pct, ago } from '@/components/kit';
import { BindForm } from './BindForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: '家長專區' };

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
      <Card title="綁定孩子"><BindForm /></Card>
    </>
  );
}
