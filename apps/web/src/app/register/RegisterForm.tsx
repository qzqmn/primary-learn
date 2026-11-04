'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, AuthShell, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

export function RegisterForm({ teacherOpen, parentOpen, teacherAuto }: { teacherOpen: boolean; parentOpen: boolean; teacherAuto: boolean }) {
  const [role, setRole] = useState<'teacher' | 'parent'>(teacherOpen ? 'teacher' : 'parent');
  const [f, setF] = useState({ displayName: '', username: '', email: '', password: '' });
  const [step, setStep] = useState<'form' | 'code' | 'done'>('form');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const r = await send('/api/auth/register', { role, ...f });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '註冊失敗');
    setMsg(r.data.message ?? '');
    setStep('code');
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const r = await send('/api/auth/register/verify', { email: f.email, code });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '驗證失敗');
    setPending(!!r.data.pending);
    setStep('done');
  }

  if (step === 'done')
    return (
      <AuthShell title="註冊完成">
        <div className="space-y-4">
          <Alert kind="ok">{pending ? '你的電郵已驗證。帳號正在等待管理員批准，批准後即可登入。' : '你的電郵已驗證，現在可以登入了。'}</Alert>
          <Link href="/login" className="block rounded-lg bg-ballpoint px-4 py-2.5 text-center font-semibold text-white">前往登入</Link>
        </div>
      </AuthShell>
    );
  if (step === 'code')
    return (
      <AuthShell title="輸入驗證碼" subtitle={`驗證碼已發到 ${f.email}`}>
        <form onSubmit={verify} className="space-y-4">
          {msg && <Alert kind="info">{msg}</Alert>}
          <Field label="6 位驗證碼" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={10} required />
          {err && <Alert>{err}</Alert>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? '驗證中…' : '完成註冊'}</Button>
          <button type="button" onClick={() => { setStep('form'); setErr(''); }} className="block w-full text-center text-sm font-semibold text-ballpoint underline underline-offset-2">返回修改資料</button>
        </form>
      </AuthShell>
    );
  return (
    <AuthShell title="註冊" subtitle="老師和家長用電郵驗證註冊；同學請向老師索取登入卡">
      <form onSubmit={start} className="space-y-4">
        <div role="radiogroup" aria-label="身份" className="flex gap-2">
          {teacherOpen && <button type="button" role="radio" aria-checked={role === 'teacher'} onClick={() => setRole('teacher')} className={`flex-1 rounded-lg border-2 px-3 py-2 font-semibold ${role === 'teacher' ? 'border-ballpoint bg-ballpoint-tint' : 'border-line bg-white'}`}>我是老師</button>}
          {parentOpen && <button type="button" role="radio" aria-checked={role === 'parent'} onClick={() => setRole('parent')} className={`flex-1 rounded-lg border-2 px-3 py-2 font-semibold ${role === 'parent' ? 'border-ballpoint bg-ballpoint-tint' : 'border-line bg-white'}`}>我是家長</button>}
        </div>
        {role === 'teacher' && !teacherAuto && <Alert kind="info">老師帳號驗證電郵後，需要管理員批准才能使用。</Alert>}
        <Field label="姓名或稱呼" value={f.displayName} onChange={set('displayName')} autoComplete="name" required maxLength={30} />
        <Field label="用戶名" value={f.username} onChange={set('username')} hint="3–20 個字元，小寫英文、數字、「.」「_」「-」" autoCapitalize="none" autoComplete="username" required />
        <Field label="電郵" type="email" value={f.email} onChange={set('email')} autoComplete="email" required />
        <Field label="密碼" type="password" value={f.password} onChange={set('password')} hint={role === 'teacher' ? '至少 10 個字元' : '至少 8 個字元'} autoComplete="new-password" required />
        {err && <Alert>{err}</Alert>}
        <Button type="submit" disabled={busy || (!teacherOpen && !parentOpen)} className="w-full">{busy ? '發送中…' : '發送驗證碼'}</Button>
        <p className="text-center text-sm"><Link href="/login" className="font-semibold text-ballpoint underline underline-offset-2">已有帳號？登入</Link></p>
      </form>
    </AuthShell>
  );
}
