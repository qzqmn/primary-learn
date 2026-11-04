'use client';

import { useEffect, useRef, useState } from 'react';
import { PracticeRunner, type RunnerData } from '@/components/PracticeRunner';
import { Button } from '@/components/ui';
import { send } from '@/lib/client';

export function Practice({ unitId, assignmentId, unitTitle }: { unitId: string; assignmentId?: string; unitTitle: string }) {
  const [count, setCount] = useState(10);
  const [data, setData] = useState<RunnerData | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data) top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [data]);

  async function start() {
    setBusy(true);
    setErr('');
    const r = await send('/api/learn/start', { unitId, count, assignmentId });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '無法開始練習');
    setData(r.data as unknown as RunnerData);
  }

  if (data) return <div ref={top}><PracticeRunner key={data.attemptId} data={data} onAgain={() => setData(null)} /></div>;
  return (
    <div className="space-y-3 rounded-xl border-2 border-ballpoint bg-ballpoint-tint p-4">
      {!assignmentId && (
        <fieldset>
          <legend className="mb-2 font-semibold">今次做幾多題？</legend>
          <div className="flex gap-2">
            {[5, 10, 15, 20].map((n) => (
              <label key={n} className={`cursor-pointer rounded-lg border-2 px-4 py-2 font-bold ${count === n ? 'border-ballpoint bg-white' : 'border-transparent bg-white/60'}`}>
                <input type="radio" name="count" className="sr-only" checked={count === n} onChange={() => setCount(n)} />
                {n}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {err && <p role="alert" className="text-pen">{err}</p>}
      <Button onClick={start} disabled={busy} className="w-full text-lg">
        {busy ? '準備中…' : assignmentId ? `開始功課：${unitTitle}` : '開始練習'}
      </Button>
    </div>
  );
}
