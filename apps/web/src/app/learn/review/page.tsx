'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PracticeRunner, type RunnerData } from '@/components/PracticeRunner';
import { Button } from '@/components/ui';
import { send } from '@/lib/client';

export default function ReviewPage() {
  const [due, setDue] = useState<number | null>(null);
  const [data, setData] = useState<RunnerData | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshDue = useCallback(async () => {
    const r = await send('/api/learn/review', undefined, 'GET');
    setDue(r.ok ? Number(r.data.due) || 0 : 0);
  }, []);

  useEffect(() => {
    void refreshDue();
  }, [refreshDue]);

  async function start() {
    setBusy(true);
    setErr('');
    const r = await send('/api/learn/review', {});
    setBusy(false);
    if (!r.ok) {
      setErr(r.data.error ?? '無法開始複習');
      void refreshDue();
      return;
    }
    setData(r.data as unknown as RunnerData);
  }

  if (data) {
    return (
      <PracticeRunner
        key={data.attemptId}
        data={data}
        onAgain={() => {
          setData(null);
          void refreshDue();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/learn" className="text-sm font-semibold text-ballpoint underline underline-offset-2">← 返回我的學習</Link>
      <div>
        <h1 className="text-2xl font-bold">今日複習</h1>
        <p className="mt-1 text-sm text-ink-soft">間隔重複（Spaced Repetition，SRS）把答錯的題目排入複習日程，趁快要忘記時再練一次。</p>
      </div>

      <section className="space-y-2 rounded-xl border-2 border-line bg-white p-4">
        <h2 className="text-lg font-bold">複習是怎樣排程的？</h2>
        <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-ink-soft">
          <li>答錯的題目會變成一張卡片，隔天（1 日後）到期。</li>
          <li>答對：間隔由 1 日 → 6 日 → 之後按熟練度倍增，愈答得穩、愈久才再出現。</li>
          <li>答錯：間隔重設為 1 日，並調低難度係數，隔天再練。</li>
          <li>每天回來把到期題目清掉，記憶就更牢固。</li>
        </ul>
      </section>

      <section className="rounded-xl border-2 border-ballpoint bg-ballpoint-tint p-4">
        <p className="text-sm font-semibold">目前到期題目</p>
        <p className="my-1 text-3xl font-bold tabular-nums text-ballpoint" aria-live="polite">
          {due === null ? '載入中…' : `${due} 題`}
        </p>
        {err && <p role="alert" className="mb-2 text-sm text-pen">{err}</p>}
        <Button onClick={start} disabled={busy || due === null || due === 0} className="w-full text-lg sm:w-auto">
          {busy ? '準備中…' : due === 0 ? '今天已複習完畢' : '開始複習（最多 10 題）'}
        </Button>
        {due === 0 && <p className="mt-2 text-sm text-ink-soft">暫時沒有到期題目，明天再來，或先做其他練習。</p>}
      </section>
    </div>
  );
}
