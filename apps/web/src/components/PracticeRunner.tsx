'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { send } from '@/lib/client';

export type RunnerQuestion = { type: 'choice' | 'number' | 'fraction' | 'text'; prompt: string; choices?: string[]; tag: string; suffix?: string };
export type RunnerData = { attemptId: string; kind: string; unit: { id: string; title: string }; questions: RunnerQuestion[] };
type Feedback = { correct: boolean; answer: string; explain: string | null };
type Summary = { total: number; answered: number; correct: number; stars: number };

export function PracticeRunner({ data, onAgain }: { data: RunnerData; onAgain: () => void }) {
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [fb, setFb] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const t0 = useRef(Date.now());
  const input = useRef<HTMLInputElement>(null);
  const q = data.questions[idx];
  const last = idx === data.questions.length - 1;

  useEffect(() => {
    t0.current = Date.now();
    input.current?.focus();
  }, [idx]);

  async function submit(answer: string) {
    if (busy || fb || !answer.trim()) return;
    setBusy(true);
    setErr('');
    const r = await send('/api/learn/answer', { attemptId: data.attemptId, idx, answer, timeMs: Date.now() - t0.current });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '提交失敗，請再試');
    setFb(r.data as unknown as Feedback);
    if (r.data.correct) setScore((s) => s + 1);
  }

  async function next() {
    if (!last) {
      setIdx(idx + 1);
      setValue('');
      setFb(null);
      return;
    }
    setBusy(true);
    const r = await send('/api/learn/finish', { attemptId: data.attemptId });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '無法完成，請再試');
    setSummary(r.data as unknown as Summary);
  }

  if (summary) {
    const msg = summary.stars === 3 ? '太厲害了！' : summary.stars === 2 ? '做得好！' : summary.stars === 1 ? '不錯，繼續努力！' : '不要緊，多練習就會進步！';
    return (
      <div className="space-y-4 rounded-xl border-2 border-line bg-white p-6 text-center" role="status">
        <p className="text-4xl" aria-label={`${summary.stars} 顆星`}>{[1, 2, 3].map((i) => <span key={i} className={i <= summary.stars ? 'text-[#e8a900]' : 'text-line'}>★</span>)}</p>
        <h2 className="text-2xl font-bold">{msg}</h2>
        <p className="text-lg">答對 <b>{summary.correct}</b> / {summary.total} 題</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onAgain}>再做一次</Button>
          <a href="/learn" className="inline-flex items-center justify-center rounded-lg border-2 border-line bg-white px-4 py-2.5 font-semibold hover:border-ballpoint">返回首頁</a>
          {summary.correct < summary.total && <a href="/learn/mistakes" className="inline-flex items-center justify-center rounded-lg border-2 border-line bg-white px-4 py-2.5 font-semibold hover:border-ballpoint">看錯題本</a>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border-2 border-line bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>{data.unit.title}</span>
        <span aria-live="polite">第 {idx + 1} / {data.questions.length} 題</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-paper" aria-hidden>
        <div className="h-full bg-ballpoint transition-all" style={{ width: `${(idx / data.questions.length) * 100}%` }} />
      </div>

      <p className="text-2xl font-bold leading-snug sm:text-3xl">{q.prompt}</p>

      {q.type === 'choice' ? (
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="選擇答案">
          {q.choices!.map((c) => {
            const chosen = value === c;
            const state = fb ? (c === fb.answer ? 'border-ok bg-ok-tint' : chosen ? 'border-pen bg-pen-tint' : 'border-line opacity-60') : chosen ? 'border-ballpoint bg-ballpoint-tint' : 'border-line hover:border-ballpoint';
            return (
              <button key={c} disabled={!!fb || busy} onClick={() => { setValue(c); void submit(c); }} className={`rounded-xl border-2 px-4 py-4 text-left text-xl font-semibold ${state}`}>
                {c}
                {fb && c === fb.answer && <span className="sr-only">（正確答案）</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void submit(value); }} className="flex items-center gap-2">
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!!fb || busy}
            inputMode={q.type === 'number' ? 'decimal' : q.type === 'fraction' ? 'text' : 'text'}
            autoComplete="off"
            autoCapitalize="none"
            aria-label="你的答案"
            className="w-full max-w-xs rounded-xl border-2 border-line px-4 py-3 text-2xl font-semibold outline-none focus:border-ballpoint disabled:bg-paper"
          />
          {q.suffix && <span className="text-lg">{q.suffix}</span>}
          {!fb && <Button type="submit" disabled={busy || !value.trim()} className="text-lg">提交</Button>}
        </form>
      )}

      {err && <p role="alert" className="text-pen">{err}</p>}

      {fb && (
        <div role="status" className={`space-y-2 rounded-xl border-2 p-4 ${fb.correct ? 'border-ok bg-ok-tint' : 'border-pen bg-pen-tint'}`}>
          <p className="text-xl font-bold">{fb.correct ? '✓ 答對了！' : '✗ 不對喎'}</p>
          {!fb.correct && <p>正確答案：<b className="text-lg">{fb.answer}</b></p>}
          {fb.explain && <p className="text-sm leading-relaxed">{fb.explain}</p>}
          <Button onClick={next} disabled={busy} autoFocus className="mt-1 w-full text-lg sm:w-auto">{last ? '完成' : '下一題'}</Button>
        </div>
      )}
      <p className="text-right text-xs text-ink-soft">目前答對 {score} 題</p>
    </div>
  );
}
