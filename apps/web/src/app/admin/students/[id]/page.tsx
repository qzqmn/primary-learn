import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pageUser } from '@/lib/pageAuth';
import { getViewableStudent } from '@/lib/access';
import { StudentReport } from '@/components/StudentReport';

export const dynamic = 'force-dynamic';

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await pageUser(['admin', 'teacher']);
  let r;
  try {
    r = getViewableStudent(me, id);
  } catch {
    redirect('/admin/classes');
  }
  return (
    <>
      <Link href={r.cls ? `/admin/classes/${r.cls.id}` : '/admin/classes'} className="text-sm font-semibold text-ballpoint underline underline-offset-2">← {r.cls?.name ?? '返回'}</Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{r.student.nickname}</h1>
          <p className="text-ink-soft">{r.cls ? `${r.cls.name} · P${r.cls.grade}` : ''}{r.student.note ? ` · ${r.student.note}` : ''}</p>
        </div>
        <a href={`/api/students/${id}/report`} className="text-sm font-semibold text-ballpoint underline underline-offset-2">匯出作答明細 CSV</a>
      </header>
      <StudentReport studentId={id} name={r.student.nickname ?? '學生'} />
    </>
  );
}
