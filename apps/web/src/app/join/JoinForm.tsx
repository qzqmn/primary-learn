'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, AuthShell, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

export function JoinForm() {
  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<null | { pending: boolean }>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const r = await send('/api/auth/student-join', { classCode: code, nickname: nick, password: pw });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '加入失敗');
    setDone({ pending: !!r.data.pending });
  }

  if (done)
    return (
      <AuthShell title={done.pending ? '申請已送出' : '加入成功'}>
        <div className="space-y-4">
          <Alert kind="ok">{done.pending ? '請等老師批准，之後就可以用班級代碼、暱稱和密碼登入。' : '現在可以登入了！請記住你的暱稱和密碼。'}</Alert>
          <Link href={`/login?t=student&c=${encodeURIComponent(code)}&n=${encodeURIComponent(nick)}`} className="block rounded-lg bg-ballpoint px-4 py-2.5 text-center font-semibold text-white">前往登入</Link>
        </div>
      </AuthShell>
    );
  return (
    <AuthShell title="加入班級" subtitle="向老師索取班級代碼，再自己取一個暱稱（請不要用真名）">
      <form onSubmit={submit} className="space-y-4">
        <Field label="班級代碼" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" required />
        <Field label="暱稱" value={nick} onChange={(e) => setNick(e.target.value)} hint="1–12 個字，不可有空格" autoComplete="off" required />
        <Field label="設定密碼" type="password" value={pw} onChange={(e) => setPw(e.target.value)} hint="至少 6 個字元" autoComplete="new-password" required minLength={6} />
        {err && <Alert>{err}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? '送出中…' : '加入'}</Button>
        <p className="text-center text-sm"><Link href="/login?t=student" className="font-semibold text-ballpoint underline underline-offset-2">已有帳號？登入</Link></p>
      </form>
    </AuthShell>
  );
}
