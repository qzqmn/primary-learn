'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

export function NewTeacher() {
  const router = useRouter();
  const [f, setF] = useState({ displayName: '', username: '', email: '' });
  const [err, setErr] = useState('');
  const [made, setMade] = useState<{ username: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMade(null);
    const r = await send('/api/admin/teachers', { ...f, email: f.email || undefined });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '建立失敗');
    setMade({ username: r.data.username, password: r.data.password });
    setF({ displayName: '', username: '', email: '' });
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="姓名" value={f.displayName} onChange={set('displayName')} maxLength={30} required />
        <Field label="用戶名" value={f.username} onChange={set('username')} autoCapitalize="none" required />
        <Field label="電郵（可不填）" type="email" value={f.email} onChange={set('email')} />
      </div>
      <Button type="submit" disabled={busy}>建立並產生臨時密碼</Button>
      {err && <Alert>{err}</Alert>}
      {made && (
        <Alert kind="ok">
          用戶名 <b className="font-mono">{made.username}</b>，臨時密碼 <b className="font-mono">{made.password}</b>。只顯示一次，老師首次登入須更改密碼。
        </Alert>
      )}
    </form>
  );
}

type InviteRow = { id: string; role: string; expiresAt: number; maxUses: number; uses: number; createdAt: number };

export function InviteTools() {
  const [role, setRole] = useState<'teacher' | 'parent'>('teacher');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<InviteRow[]>([]);

  const load = useCallback(async () => {
    const r = await send('/api/admin/invites', undefined, 'GET');
    if (r.ok) setList((r.data.invites as InviteRow[]) ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setCopied(false);
    setBusy(true);
    const r = await send('/api/admin/invites', { role, maxUses: Number(maxUses), expiresInDays: Number(expiresInDays) });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '產生失敗');
    setUrl(String(r.data.url ?? ''));
    await load();
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setErr('複製失敗，請手動選取連結文字複製。');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">產生一條讓對方自行註冊老師／家長帳號的連結。邀請碼的明文只會顯示一次，資料庫只保存雜湊值。</p>
      <form onSubmit={generate} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">身份</span>
            <select value={role} onChange={(e) => setRole(e.target.value as 'teacher' | 'parent')} className="w-full rounded-lg border-2 border-line bg-white px-3 py-2.5 text-base">
              <option value="teacher">老師</option>
              <option value="parent">家長</option>
            </select>
          </label>
          <Field label="可使用次數" type="number" min={1} max={50} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} required />
          <Field label="有效天數" type="number" min={1} max={30} value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} required />
        </div>
        <Button type="submit" disabled={busy}>{busy ? '產生中…' : '產生邀請連結'}</Button>
      </form>

      {err && <Alert>{err}</Alert>}
      {url && (
        <Alert kind="ok">
          <p className="mb-2 font-semibold">邀請連結已產生，請立即複製並交給對方（離開本頁後不會再顯示）：</p>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg border-2 border-line bg-white px-3 py-2 font-mono text-xs" />
            <Button type="button" variant="ghost" onClick={copy}>{copied ? '已複製' : '複製連結'}</Button>
          </div>
        </Alert>
      )}

      {list.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-line text-ink-soft">
                <th className="px-2 py-2 font-semibold">身份</th>
                <th className="px-2 py-2 font-semibold">已用／上限</th>
                <th className="px-2 py-2 font-semibold">到期日</th>
                <th className="px-2 py-2 font-semibold">狀態</th>
              </tr>
            </thead>
            <tbody>
              {list.map((it) => {
                const expired = it.expiresAt <= Date.now() || it.uses >= it.maxUses;
                return (
                  <tr key={it.id} className="border-b border-line/60">
                    <td className="px-2 py-2">{it.role === 'teacher' ? '老師' : '家長'}</td>
                    <td className="px-2 py-2 tabular-nums">{it.uses} / {it.maxUses}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{new Date(it.expiresAt).toLocaleDateString('zh-HK')}</td>
                    <td className="px-2 py-2">{expired ? '已失效' : '有效'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PersonActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  async function act(action: string) {
    const r = await send(`/api/admin/users/${id}`, { action }, 'PATCH');
    if (!r.ok) return setMsg(r.data.error ?? '操作失敗');
    setMsg(action === 'reset_password' ? `臨時密碼：${r.data.password}（只顯示一次）` : '已更新');
    router.refresh();
  }
  const b = 'rounded border border-line bg-white px-2 py-1 text-xs font-semibold hover:border-ballpoint';
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {status === 'pending' && <button className={b} onClick={() => act('approve')}>批准</button>}
        {status === 'disabled' ? <button className={b} onClick={() => act('enable')}>啟用</button> : <button className={b} onClick={() => confirm('停用此帳號？對方會被立即登出。') && act('disable')}>停用</button>}
        <button className={b} onClick={() => confirm('重設密碼？') && act('reset_password')}>重設密碼</button>
      </div>
      {msg && <p className="font-mono text-xs" role="status">{msg}</p>}
    </div>
  );
}
