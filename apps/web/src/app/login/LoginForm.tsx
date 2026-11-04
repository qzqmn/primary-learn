'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AuthShell, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

type Tab = 'staff' | 'student';

export function LoginForm({ initialTab = 'staff', classCode = '', nickname = '', canRegister = false }: { initialTab?: Tab; classCode?: string; nickname?: string; canRegister?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(classCode);
  const [nick, setNick] = useState(nickname);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const r = tab === 'staff' ? await send('/api/auth/login', { identifier, password }) : await send('/api/auth/student-login', { classCode: code, nickname: nick, password });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? '登入失敗');
    router.push(r.data.mustChangePassword ? '/account/password' : '/');
    router.refresh();
  }

  const tabBtn = (t: Tab, label: string) => (
    <button type="button" role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setError(''); }} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${tab === t ? 'bg-ballpoint text-white' : 'text-ink-soft hover:bg-ballpoint-tint'}`}>
      {label}
    </button>
  );

  return (
    <AuthShell title="登入" subtitle={tab === 'staff' ? '老師、家長和管理員請用用戶名或電郵登入' : '同學請輸入老師給你的班級代碼和暱稱'}>
      <div role="tablist" aria-label="登入身份" className="mb-5 flex gap-1 rounded-xl border-2 border-line bg-white p-1">
        {tabBtn('staff', '老師／家長／管理員')}
        {tabBtn('student', '我是學生')}
      </div>
      <form onSubmit={submit} className="space-y-4">
        {tab === 'staff' ? (
          <Field label="用戶名或電郵" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        ) : (
          <>
            <Field label="班級代碼" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" placeholder="例：K7M2QX" required />
            <Field label="我的暱稱" value={nick} onChange={(e) => setNick(e.target.value)} autoComplete="username" required />
          </>
        )}
        <Field label="密碼" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? '登入中…' : '登入'}</Button>
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-sm">
          {tab === 'staff' ? (
            <>
              <Link href="/forgot" className="font-semibold text-ballpoint underline underline-offset-2">忘記密碼？</Link>
              {canRegister && <Link href="/register" className="font-semibold text-ballpoint underline underline-offset-2">老師／家長註冊</Link>}
            </>
          ) : (
            <Link href="/join" className="font-semibold text-ballpoint underline underline-offset-2">第一次來？用班級代碼加入</Link>
          )}
        </p>
      </form>
    </AuthShell>
  );
}
