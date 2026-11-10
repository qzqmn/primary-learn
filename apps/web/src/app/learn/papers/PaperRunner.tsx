'use client';

import { useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { Card, Empty } from '@/components/kit';
import { PracticeRunner, type RunnerData } from '@/components/PracticeRunner';
import { SUBJECT_LABEL } from '@/lib/content/types';
import { send } from '@/lib/client';

type Subject = 'math' | 'english' | 'chinese' | 'general';
type Kind = 'original' | 'licensed' | 'index' | 'private' | 'generated';

type Item = {
  id: string;
  title: string;
  subject: Subject;
  grade: number;
  kind: Kind;
  sourceUrl: string | null;
  license: string | null;
  questionCount: number;
  timeLimitMin: number | null;
  pointsPerQuestion: number;
};

export function PaperRunner({ papers, assignmentId = null, focusPaperId = null }: { papers: Item[]; assignmentId?: string | null; focusPaperId?: string | null }) {
  const [data, setData] = useState<RunnerData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  async function start(id: string) {
    setBusy(id);
    setErr('');
    const r = await send(`/api/papers/${id}/start`, { assignmentId: id === focusPaperId ? assignmentId : null });
    setBusy(null);
    if (!r.ok) return setErr(r.data.error ?? '無法開始作答');
    setData(r.data as unknown as RunnerData);
  }

  if (data) return <PracticeRunner key={data.attemptId} data={data} onAgain={() => setData(null)} />;

  return (
    <div className="space-y-3">
      {err && <Alert>{err}</Alert>}
      {papers.length === 0 ? (
        <Empty>暫時沒有可供作答的試卷。</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {papers.map((p) => (
            <li key={p.id}>
              <Card>
                <p className="text-xs text-ink-soft">P{p.grade} {SUBJECT_LABEL[p.subject]}</p>
                <p className="mt-0.5 font-bold">
                  {p.title}
                  {focusPaperId === p.id && <span className="ml-2 rounded-full bg-hi px-2 py-0.5 align-middle text-xs font-semibold">老師指派</span>}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {p.kind === 'index' ? '外連索引卷（不存題目）' : `${p.questionCount} 題`}
                  {p.timeLimitMin ? ` · 時限 ${p.timeLimitMin} 分鐘` : ''}
                  {p.kind !== 'index' ? ` · 每題 ${p.pointsPerQuestion} 分` : ''}
                </p>
                {p.license && <p className="mt-1 text-xs text-ink-soft">授權：{p.license}</p>}
                <div className="mt-3">
                  {p.kind === 'index' ? (
                    p.sourceUrl ? (
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg bg-ballpoint px-4 py-2.5 text-base font-semibold text-white hover:bg-ballpoint-dark">前往原站 ↗</a>
                    ) : (
                      <span className="text-sm text-pen">沒有提供原站連結</span>
                    )
                  ) : (
                    <Button onClick={() => start(p.id)} disabled={busy !== null}>{busy === p.id ? '準備中…' : '開始作答'}</Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
