'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@/components/ui';
import { send } from '@/lib/client';

export function PackTools() {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; t: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const f = file.current?.files?.[0];
    if (!f) return;
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch('/api/admin/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: await f.text() });
      const d = await r.json().catch(() => ({}));
      setRes(r.ok ? { ok: true, t: `已加入「${d.name}」：${d.units} 個單元、${d.questions} 題` } : { ok: false, t: d.error ?? `上傳失敗（${r.status}）` });
      if (r.ok) router.refresh();
    } catch {
      setRes({ ok: false, t: '上傳失敗，請檢查網絡' });
    }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Alert kind="info">
        內容包必須註明<b>授權</b>（<code>license</code>）。只接受 CC0、CC BY、CC BY-SA、MIT、Apache-2.0、BSD、ISC、Unlicense 或原創內容；不接受 NC／ND 或沒有授權的內容。請自行確認來源真的使用該授權，並核對題目答案正確、符合年級——<b>上傳後學生馬上會看到</b>。格式見 docs/content-packs.md。
      </Alert>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">內容包檔案（.json）</span>
        <input ref={file} type="file" accept=".json,application/json" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-2 file:border-line file:bg-white file:px-3 file:py-2 file:font-semibold" />
      </label>
      {res && <Alert kind={res.ok ? 'ok' : 'error'}>{res.t}</Alert>}
      <Button type="submit" disabled={busy}>{busy ? '檢查並上傳中…' : '上傳'}</Button>
    </form>
  );
}

export function PackActions({ name, enabled }: { name: string; enabled: boolean }) {
  const router = useRouter();
  const b = 'rounded border border-line bg-white px-2 py-1 text-xs font-semibold hover:border-ballpoint';
  return (
    <div className="flex flex-wrap gap-1">
      <button className={b} onClick={async () => { await send(`/api/admin/content/${name}`, { enabled: !enabled }, 'PATCH'); router.refresh(); }}>{enabled ? '停用' : '啟用'}</button>
      <a className={b} href={`/api/admin/content/${name}`}>下載</a>
      <button className={`${b} text-pen`} onClick={async () => { if (confirm(`刪除內容包「${name}」？學生已有的作答記錄會保留。`)) { await send(`/api/admin/content/${name}`, undefined, 'DELETE'); router.refresh(); } }}>刪除</button>
    </div>
  );
}
