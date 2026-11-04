'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

type Info = { admins: number; teachers: number; parents: number; students: number; classes: number; answers: number; lastActivity: number | null; migrations: number };
type Staged = { source: string; info: Info };

const when = (t: number | null) => (t ? new Date(t).toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' }) : '無');

function Summary({ s }: { s: Staged }) {
  const i = s.info;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border-2 border-line bg-paper p-3 text-sm sm:grid-cols-3">
      <div><dt className="text-ink-soft">來源</dt><dd className="font-semibold">{s.source}</dd></div>
      <div><dt className="text-ink-soft">學生</dt><dd className="font-semibold tabular-nums">{i.students}</dd></div>
      <div><dt className="text-ink-soft">老師</dt><dd className="font-semibold tabular-nums">{i.teachers}</dd></div>
      <div><dt className="text-ink-soft">家長</dt><dd className="font-semibold tabular-nums">{i.parents}</dd></div>
      <div><dt className="text-ink-soft">班級</dt><dd className="font-semibold tabular-nums">{i.classes}</dd></div>
      <div><dt className="text-ink-soft">作答記錄</dt><dd className="font-semibold tabular-nums">{i.answers}</dd></div>
      <div className="col-span-2 sm:col-span-3"><dt className="text-ink-soft">最後一次練習</dt><dd className="font-semibold">{when(i.lastActivity)}</dd></div>
    </dl>
  );
}

function RestoreConfirm({ staged, onCancel }: { staged: Staged; onCancel: () => void }) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await send('/api/admin/restore/apply', { password: pw, confirm });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '還原失敗');
    setDone(r.data.safety as string);
    setTimeout(() => { window.location.href = '/login'; }, 2500);
  }

  if (done)
    return <Alert kind="ok">還原完成。還原前的資料已另存為 <b className="font-mono">{done}</b>。即將轉到登入頁，請重新登入…</Alert>;
  return (
    <form onSubmit={apply} className="space-y-3">
      <Summary s={staged} />
      <Alert kind="info">按下「確認還原」後，目前所有資料會被上面這份備份取代。</Alert>
      <Field label="你的管理員密碼" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
      <Field label="請輸入「還原」二字確認" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" required />
      {err && <Alert>{err}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || confirm.trim() !== '還原' || !pw}>{busy ? '還原中，請勿關閉頁面…' : '確認還原'}</Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>取消</Button>
      </div>
    </form>
  );
}

export function BackupTools({ mode }: { mode: 'export' | 'import' }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [staged, setStaged] = useState<Staged | null>(null);

  async function createOnServer() {
    setBusy(true);
    setErr('');
    const r = await send('/api/admin/backup/create', {});
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '建立失敗');
    setMsg(`已在伺服器建立 ${r.data.name}`);
    router.refresh();
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const f = file.current?.files?.[0];
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/restore/stage', { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: f });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setErr(data.error ?? `上傳失敗（${res.status}）`);
      else setStaged(data as Staged);
    } catch {
      setErr('上傳失敗，請檢查網絡（經過代理時要留意上傳大小限制）');
    }
    setBusy(false);
  }

  if (mode === 'export')
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/backup" className="inline-flex items-center rounded-lg bg-ballpoint px-4 py-2.5 font-semibold text-white">立即下載備份</a>
          <Button variant="ghost" onClick={createOnServer} disabled={busy}>在伺服器上建立一份</Button>
        </div>
        {msg && <Alert kind="ok">{msg}</Alert>}
        {err && <Alert>{err}</Alert>}
      </div>
    );

  if (staged) return <RestoreConfirm staged={staged} onCancel={() => setStaged(null)} />;
  return (
    <form onSubmit={upload} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">選擇備份檔（.db）</span>
        <input ref={file} type="file" accept=".db,application/octet-stream" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-2 file:border-line file:bg-white file:px-3 file:py-2 file:font-semibold" />
      </label>
      {err && <Alert>{err}</Alert>}
      <Button type="submit" disabled={busy}>{busy ? '上傳並檢查中…' : '上傳並檢查'}</Button>
      <p className="text-xs text-ink-soft">這一步只會檢查檔案，不會改動任何現有資料。</p>
    </form>
  );
}

export function StoredBackupActions({ name }: { name: string }) {
  const [staged, setStaged] = useState<Staged | null>(null);
  const [err, setErr] = useState('');
  async function pick() {
    setErr('');
    const r = await send('/api/admin/restore/stage', { name });
    if (!r.ok) return setErr(r.data.error ?? '檢查失敗');
    setStaged(r.data as unknown as Staged);
  }
  if (staged)
    return (
      <div className="min-w-72 rounded-lg border-2 border-hi bg-hi/20 p-3">
        <RestoreConfirm staged={staged} onCancel={() => setStaged(null)} />
      </div>
    );
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        <a href={`/api/admin/backup?name=${encodeURIComponent(name)}`} className="rounded border border-line bg-white px-2 py-1 text-xs font-semibold hover:border-ballpoint">下載</a>
        <button onClick={pick} className="rounded border border-line bg-white px-2 py-1 text-xs font-semibold hover:border-ballpoint">還原此備份…</button>
      </div>
      {err && <p className="text-xs text-pen">{err}</p>}
    </div>
  );
}
