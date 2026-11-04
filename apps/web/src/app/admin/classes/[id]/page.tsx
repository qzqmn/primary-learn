import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { pageUser } from '@/lib/pageAuth';
import { getManagedClass } from '@/lib/access';
import { getDb } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
import { allUnits, findUnit } from '@/lib/content/registry';
import { SUBJECT_LABEL } from '@/lib/content/types';
import { assignmentStatus, classOverview } from '@/lib/stats';
import { Bar, Card, Empty, Table, ago, hk } from '@/components/kit';
import { AddStudents, AssignmentForm, ClassSettings, DeleteAssignment, StudentActions } from './ClassTools';

export const dynamic = 'force-dynamic';

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await pageUser(['admin', 'teacher']);
  let cls;
  try {
    cls = getManagedClass(me, id);
  } catch {
    redirect('/admin/classes');
  }
  const students = classOverview(id);
  const asg = getDb().select().from(assignments).where(eq(assignments.classId, id)).orderBy(desc(assignments.createdAt)).all();
  const units = allUnits().filter((u) => u.grade === cls.grade || Math.abs(u.grade - cls.grade) <= 1).map((u) => ({ id: u.id, label: `P${u.grade} ${SUBJECT_LABEL[u.subject]}・${u.title}` }));

  return (
    <>
      <Link href="/admin/classes" className="text-sm font-semibold text-ballpoint underline underline-offset-2">← 所有班級</Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{cls.name}</h1>
          <p className="text-ink-soft">P{cls.grade} · {students.length} 位學生</p>
        </div>
        <div className="rounded-xl border-2 border-ink bg-white px-4 py-2 text-center">
          <p className="text-xs text-ink-soft">班級代碼</p>
          <p className="font-mono text-2xl font-bold tracking-[0.3em]">{cls.joinCode}</p>
        </div>
      </header>

      <Card title="學生" action={<a href={`/api/classes/${id}/export`} className="text-sm font-semibold text-ballpoint underline underline-offset-2">匯出 CSV</a>}>
        {students.length === 0 ? (
          <Empty>還沒有學生。用下面的表單新增，系統會替每位同學產生初始密碼和可列印的登入卡。</Empty>
        ) : (
          <Table head={['暱稱', '作答', '正確率', '近 7 日', '最後練習', '錯題', '操作']}>
            {students.map((s) => (
              <tr key={s.id} className="align-top">
                <td className="font-semibold">
                  <Link href={`/admin/students/${s.id}`} className="text-ballpoint underline underline-offset-2">{s.nickname}</Link>
                  {s.status !== 'active' && <span className="ml-1 rounded bg-hi px-1.5 text-xs">{s.status === 'pending' ? '待批准' : '已停用'}</span>}
                  {s.note && <div className="text-xs font-normal text-ink-soft">{s.note}</div>}
                </td>
                <td className="tabular-nums">{s.answered}</td>
                <td><Bar value={s.answered ? s.correct / s.answered : null} /></td>
                <td className="tabular-nums">{s.weekAnswered}</td>
                <td className="whitespace-nowrap">{ago(s.lastActive)}</td>
                <td className="tabular-nums">{s.openMistakes}</td>
                <td className="min-w-52"><StudentActions s={s} joinCode={cls.joinCode} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="新增學生"><AddStudents classId={id} joinCode={cls.joinCode} /></Card>

      <Card title="功課">
        <AssignmentForm classId={id} units={units} />
        {asg.length > 0 && (
          <ul className="mt-4 space-y-3">
            {asg.map((a) => {
              const st = assignmentStatus(a.id, id);
              const done = st.filter((x) => x.done).length;
              return (
                <li key={a.id} className="rounded-lg border-2 border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-sm text-ink-soft">{findUnit(a.unitId)?.title} · {a.count} 題 · 派發 {hk(a.createdAt, false)}{a.dueAt ? ` · 限期 ${hk(a.dueAt, false)}` : ''}</p>
                    </div>
                    <DeleteAssignment id={a.id} />
                  </div>
                  <p className="mt-2 text-sm font-semibold">完成 {done} / {st.length}</p>
                  <details className="mt-1 text-sm">
                    <summary className="cursor-pointer text-ballpoint">查看名單</summary>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {st.map((x) => (
                        <li key={x.id} className="flex justify-between gap-2">
                          <span>{x.done ? '✓' : '○'} {x.nickname}</span>
                          <span className="text-ink-soft">{x.done ? `最佳 ${Math.round((x.best ?? 0) * 100)}%` : '未完成'}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="班級設定"><ClassSettings cls={cls} /></Card>
    </>
  );
}
