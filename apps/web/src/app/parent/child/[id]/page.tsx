import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pageUser } from '@/lib/pageAuth';
import { getViewableStudent } from '@/lib/access';
import { StudentReport } from '@/components/StudentReport';

export const dynamic = 'force-dynamic';

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await pageUser(['parent']);
  let r;
  try {
    r = getViewableStudent(me, id);
  } catch {
    redirect('/parent');
  }
  return (
    <>
      <Link href="/parent" className="text-sm font-semibold text-ballpoint underline underline-offset-2">← 返回</Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{r.student.nickname}</h1>
          <p className="text-ink-soft">{r.cls ? `${r.cls.name} · P${r.cls.grade}` : ''}</p>
        </div>
        <a href={`/api/students/${id}/report`} className="text-sm font-semibold text-ballpoint underline underline-offset-2">下載作答明細 CSV</a>
      </header>
      <StudentReport studentId={id} name={r.student.nickname ?? '孩子'} />
    </>
  );
}
