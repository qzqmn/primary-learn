'use client';

import { useState } from 'react';
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
