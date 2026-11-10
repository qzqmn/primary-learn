'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AuthShell, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

type Tab = 'staff' | 'student';

/**
 * 登入頁。原本的伺服器端導向（未完成設定、已登入）與「可否註冊」開關，
 * 改由 GET /api/auth/login 提供狀態後在客戶端判斷，行為維持不變。
 */
export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('staff');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');
  const [otp, setOtp] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [canRegister, setCanRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setTab(q.get('t') === 'staff' ? 'staff' : q.get('c') || q.get('t') === 'student' ? 'student' : 'staff');
    setCode((q.get('c') ?? '').slice(0, 20).toUpperCase());
    setNick((q.get('n') ?? '').slice(0, 30));
    void send('/api/auth/login', undefined, 'GET').then((r) => {
      if (!r.ok) return;
      if (r.data.setupComplete === false) return router.replace('/setup');
      if (r.data.signedIn) return router.replace('/');
      setCanRegister(!!r.data.canRegister);
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const payload =
      tab === 'staff'
        ? { identifier, password, ...(otp ? { totp: otp } : {}) }
        : { classCode: code, nickname: nick, password };
    const r = tab === 'staff' ? await send('/api/auth/login', payload) : await send('/api/auth/student-login', payload);
    setBusy(false);
    if (!r.ok) {
      // 密碼正確但帳號已啟用二步驗證：顯示 OTP 輸入框，保留原本輸入的帳號資料
      if (tab === 'staff' && r.status === 403 && r.data.code === 'totp_required') setNeedTotp(true);
      return setError(r.data.error ?? '登入失敗');
    }
    router.push(r.data.mustChangePassword ? '/account/password' : '/');
    router.refresh();
  }

  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
    setNeedTotp(false);
    setOtp('');
  };

  const tabBtn = (t: Tab, label: string) => (
    <button type="button" role="tab" aria-selected={tab === t} onClick={() => switchTab(t)} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${tab === t ? 'bg-ballpoint text-white' : 'text-ink-soft hover:bg-ballpoint-tint'}`}>
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
        {tab === 'staff' && needTotp && (
          <Field
            label="二步驗證驗證碼"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="驗證應用程式上的 6 位數字"
            maxLength={6}
            hint="此帳號已啟用二步驗證，請輸入驗證應用程式顯示的 6 位數字後再按登入。"
            required
          />
        )}
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
