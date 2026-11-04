import Link from 'next/link';
import { eq, sql } from 'drizzle-orm';
import { pageUser } from '@/lib/pageAuth';
import { classesOf } from '@/lib/classes';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { Card, Empty } from '@/components/kit';
import { NewClass } from './NewClass';

export const dynamic = 'force-dynamic';
export const metadata = { title: '班級與學生' };

export default async function ClassesPage() {
  const me = await pageUser(['admin', 'teacher']);
  const list = classesOf(me.id, me.role);
  const counts = new Map(getDb().select({ c: users.classId, n: sql<number>`count(*)` }).from(users).where(eq(users.role, 'student')).groupBy(users.classId).all().map((r) => [r.c, r.n]));
  return (
    <>
      <h1 className="text-2xl font-bold">班級與學生</h1>
      <Card title="新增班級"><NewClass /></Card>
      {list.length === 0 ? (
        <Empty>還沒有班級。先在上面新增一個，再把學生加進去。</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/classes/${c.id}`} className="block rounded-xl border-2 border-line bg-white p-4 hover:border-ballpoint">
                <p className="text-lg font-bold">{c.name}{c.archived && <span className="ml-2 rounded bg-paper px-2 py-0.5 text-xs font-normal text-ink-soft">已封存</span>}</p>
                <p className="mt-1 text-sm text-ink-soft">P{c.grade} · {counts.get(c.id) ?? 0} 位學生</p>
                <p className="mt-2 text-sm">班級代碼 <span className="font-mono text-base font-bold tracking-widest">{c.joinCode}</span></p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
