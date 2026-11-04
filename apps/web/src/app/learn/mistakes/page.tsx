import Link from 'next/link';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { pageUser } from '@/lib/pageAuth';
import { getDb } from '@/lib/db';
import { mistakes } from '@/lib/db/schema';
import { findUnit } from '@/lib/content/registry';
import { Card, Empty } from '@/components/kit';
import { Redo } from './Redo';

export const dynamic = 'force-dynamic';
export const metadata = { title: '錯題本' };

export default async function Mistakes() {
  const me = await pageUser(['student']);
  const rows = getDb().select().from(mistakes).where(and(eq(mistakes.userId, me.id), isNull(mistakes.resolvedAt))).orderBy(desc(mistakes.createdAt)).all();
  const byUnit = new Map<string, number>();
  for (const r of rows) byUnit.set(r.unitId, (byUnit.get(r.unitId) ?? 0) + 1);
  return (
    <>
      <Link href="/learn" className="text-sm font-semibold text-ballpoint underline underline-offset-2">← 返回</Link>
      <h1 className="text-2xl font-bold">錯題本</h1>
      {rows.length === 0 ? (
        <Empty>錯題本是空的，太棒了！繼續保持。</Empty>
      ) : (
        <>
          <Card title={`有 ${rows.length} 題未掌握`}>
            <ul className="mb-4 space-y-1 text-sm">
              {[...byUnit].map(([u, n]) => (
                <li key={u}>{findUnit(u)?.title ?? u}：{n} 題</li>
              ))}
            </ul>
            <p className="mb-3 text-sm text-ink-soft">重做時答對了，那題就會自動移出錯題本。每次最多重做 10 題。</p>
            <Redo />
          </Card>
        </>
      )}
    </>
  );
}
