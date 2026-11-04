import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findUnit } from '@/lib/content/registry';
import { generateQuestions } from '@/lib/content/engine';
import { SUBJECT_LABEL } from '@/lib/content/types';
import { Practice } from './Practice';

export const dynamic = 'force-dynamic';

export default async function UnitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ a?: string }> }) {
  const { id } = await params;
  const { a } = await searchParams;
  const unit = findUnit(id);
  if (!unit) notFound();
  const points = unit.lesson?.points ?? unit.intro;
  // 例題由同一個題庫即時生成，答案與解釋由系統提供（這裡是教學，不是測驗）
  const examples = generateQuestions(unit, 3, Date.now() >>> 0);
  return (
    <>
      <Link href={`/learn?s=${unit.subject}&g=${unit.grade}`} className="text-sm font-semibold text-ballpoint underline underline-offset-2">← 返回</Link>
      <header>
        <p className="text-sm text-ink-soft">P{unit.grade} {SUBJECT_LABEL[unit.subject]}</p>
        <h1 className="text-2xl font-bold">{unit.title}</h1>
      </header>

      {points.length > 0 && (
        <section className="rounded-xl border-2 border-line bg-white p-4" aria-labelledby="lesson-h">
          <h2 id="lesson-h" className="mb-2 text-lg font-bold">先學一學</h2>
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
            {points.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          {unit.lesson?.pitfalls && unit.lesson.pitfalls.length > 0 && (
            <div className="mt-3 rounded-lg bg-hi/40 p-3">
              <p className="font-bold">⚠ 常見錯誤</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {unit.lesson.pitfalls.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {examples.length > 0 && (
        <section className="rounded-xl border-2 border-line bg-white p-4" aria-labelledby="ex-h">
          <h2 id="ex-h" className="mb-2 text-lg font-bold">看看例題</h2>
          <ol className="space-y-3">
            {examples.map((q, i) => (
              <li key={i} className="rounded-lg bg-paper p-3">
                <p className="font-semibold">例 {i + 1}　{q.prompt}</p>
                {q.type === 'choice' && q.choices && <p className="mt-1 text-sm text-ink-soft">選項：{q.choices.join('　／　')}</p>}
                <p className="mt-1">答案：<b>{q.answer}{q.suffix ? ` ${q.suffix}` : ''}</b></p>
                {q.explain && <p className="mt-1 text-sm leading-relaxed text-ink-soft">解釋：{q.explain}</p>}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-ink-soft">每次打開都會有不同的例題。</p>
        </section>
      )}

      <Practice unitId={unit.id} assignmentId={a} unitTitle={unit.title} />
      <p className="text-center text-xs text-ink-soft">題目來源：{unit.source === 'builtin' ? '本系統' : unit.source}{unit.license ? `（${unit.license}）` : ''}</p>
    </>
  );
}
