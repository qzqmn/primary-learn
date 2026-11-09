import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { pageUser } from '@/lib/pageAuth';
import { getDb } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
import { visiblePapers, safePaper } from '@/lib/papers';
import { PaperRunner } from './PaperRunner';

export const dynamic = 'force-dynamic';
export const metadata = { title: '試卷' };

export default async function PapersPage({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const me = await pageUser(['student']);
  const { a } = await searchParams;
  const asg = a ? getDb().select().from(assignments).where(eq(assignments.id, a)).get() : undefined;
  const valid = asg && asg.mode === 'fixed' && asg.paperId ? asg : undefined;
  const list = visiblePapers(me).map(safePaper);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">試卷</h1>
        <Link href="/learn" className="text-sm font-semibold text-ballpoint underline underline-offset-2">← 返回我的學習</Link>
      </div>
      <p className="text-sm text-ink-soft">這裏列出老師原創或經確認開放授權、並已通過審核的試卷。固定卷面的題目順序與配分固定，作答後可即時看到成績。</p>
      <PaperRunner papers={list} assignmentId={valid?.id ?? null} focusPaperId={valid?.paperId ?? null} />
    </>
  );
}
