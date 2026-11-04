'use client';

import { useState } from 'react';
import { PracticeRunner, type RunnerData } from '@/components/PracticeRunner';
import { Button } from '@/components/ui';
import { send } from '@/lib/client';

export function Redo() {
  const [data, setData] = useState<RunnerData | null>(null);
  const [err, setErr] = useState('');
  async function start() {
    const r = await send('/api/learn/redo', {});
    if (!r.ok) return setErr(r.data.error ?? '無法開始');
    setData(r.data as unknown as RunnerData);
  }
  if (data) return <PracticeRunner key={data.attemptId} data={data} onAgain={() => { setData(null); window.location.reload(); }} />;
  return (
    <div className="space-y-2">
      {err && <p role="alert" className="text-pen">{err}</p>}
      <Button onClick={start} className="w-full text-lg sm:w-auto">重做錯題</Button>
    </div>
  );
}
