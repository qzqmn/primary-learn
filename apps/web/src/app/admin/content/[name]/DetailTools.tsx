'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@/components/ui';
import { hk } from '@/components/kit';
import { send } from '@/lib/client';

type Question = { prompt: string; answer: string; explain?: string; tag: string; choices?: string[]; source?: string };

/** A3：逐題簡易編輯表單（僅資料庫上傳包會渲染） */
export function EditQuestion({ name, unitId, index, q }: { name: string; unitId: string; index: number; q: Question }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [prompt, setPrompt] = useState(q.prompt);
  const [answer, setAnswer] = useState(q.answer);
  const [explain, setExplain] = useState(q.explain ?? '');
  const [tag, setTag] = useState(q.tag);
  const [source, setSource] = useState(q.source ?? '');
  const [choices, setChoices] = useState((q.choices ?? []).join('\n'));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const patch: Record<string, unknown> = { prompt, answer, explain, tag, source };
    if (q.choices) patch.choices = choices.split('\n').map((s) => s.trim()).filter(Boolean);
    const r = await send(`/api/admin/content/${encodeURIComponent(name)}/question`, { unitId, index, patch }, 'PATCH');
    setBusy(false);
    if (!r.ok) return setMsg(r.data.error ?? '儲存失敗');
    setMsg('已儲存');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return <button type="button" className="rounded border border-line bg-white px-2 py-1 text-xs font-semibold hover:border-ballpoint" onClick={() => setOpen(true)}>編輯</button>;
  }
  return (
    <form onSubmit={submit} className="my-1 w-64 space-y-1.5 rounded-lg border-2 border-line bg-paper p-2 text-left text-xs">
      <label className="block">題面<input value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-0.5 w-full rounded border border-line px-1 py-0.5" /></label>
      <label className="block">答案<input value={answer} onChange={(e) => setAnswer(e.target.value)} className="mt-0.5 w-full rounded border border-line px-1 py-0.5" /></label>
      {q.choices && <label className="block">選項（每行一個）<textarea value={choices} onChange={(e) => setChoices(e.target.value)} rows={3} className="mt-0.5 w-full rounded border border-line px-1 py-0.5 font-mono" /></label>}
      <label className="block">解釋<input value={explain} onChange={(e) => setExplain(e.target.value)} className="mt-0.5 w-full rounded border border-line px-1 py-0.5" /></label>
      <label className="block">知識點 tag<input value={tag} onChange={(e) => setTag(e.target.value)} className="mt-0.5 w-full rounded border border-line px-1 py-0.5" /></label>
      <label className="block">逐題來源<input value={source} onChange={(e) => setSource(e.target.value)} className="mt-0.5 w-full rounded border border-line px-1 py-0.5" /></label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="rounded border border-line bg-ballpoint px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">{busy ? '儲存中…' : '儲存'}</button>
        <button type="button" className="rounded border border-line bg-white px-2 py-1 text-xs font-semibold" onClick={() => { setOpen(false); setMsg(''); }}>取消</button>
      </div>
      {msg && <Alert kind={msg === '已儲存' ? 'ok' : 'error'}>{msg}</Alert>}
    </form>
  );
}

type Sample = { unitId: string; index: number; prompt: string; choices?: string[]; answer: string; explain?: string; tag: string };

/** A6：抽檢 5 題試做＋標記已覆核 */
export function ReviewTools({ name, canMark, reviewedAt, reviewedBy }: { name: string; canMark: boolean; reviewedAt: number | null; reviewedBy: string | null }) {
  const router = useRouter();
  const [samples, setSamples] = useState<Sample[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function draw() {
    setBusy(true);
    setMsg('');
    const r = await send(`/api/admin/content/${encodeURIComponent(name)}/review`, {}, 'POST');
    setBusy(false);
    if (!r.ok) return setMsg(r.data.error ?? '抽檢失敗');
    setSamples((r.data.questions as Sample[]) ?? []);
  }
  async function mark() {
    setBusy(true);
    setMsg('');
    const r = await send(`/api/admin/content/${encodeURIComponent(name)}/review`, { mark: true }, 'POST');
    setBusy(false);
    if (!r.ok) return setMsg(r.data.error ?? '標記失敗');
    setMsg('已標記為已覆核');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        覆核狀態：{reviewedAt ? <b className="text-ok">已覆核</b> : <b>未覆核</b>}
        {reviewedAt && <span className="text-ink-soft">（{reviewedBy ?? '—'} 於 {hk(reviewedAt)}）</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={draw} disabled={busy}>抽檢 5 題</Button>
        {canMark && <Button onClick={mark} disabled={busy}>標記已覆核</Button>}
      </div>
      {!canMark && <p className="text-xs text-ink-soft">此為隨系統附帶的目錄包，僅可抽檢試做；標記覆核只適用於資料庫上傳的內容包。</p>}
      {samples && (
        <ol className="space-y-2">
          {samples.map((s, i) => (
            <li key={i} className="rounded-lg bg-paper p-2 text-sm">
              <p className="font-semibold">第 {i + 1} 題　{s.prompt}</p>
              {s.choices && <p className="mt-1 text-xs text-ink-soft">選項：{s.choices.join('　／　')}</p>}
              <p className="mt-1 text-xs">答案：<b>{s.answer}</b>　知識點：{s.tag}　<span className="font-mono text-ink-soft">（{s.unitId} #{s.index}）</span></p>
              {s.explain && <p className="mt-1 text-xs text-ink-soft">解釋：{s.explain}</p>}
            </li>
          ))}
          {samples.length === 0 && <li className="text-sm text-ink-soft">此內容包沒有題目。</li>}
        </ol>
      )}
      {msg && <Alert kind={msg === '已標記為已覆核' ? 'ok' : 'error'}>{msg}</Alert>}
    </div>
  );
}
