'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, AuthShell, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

export function ForgotForm({ mailReady }: { mailReady: boolean }) {
  const [mode, setMode] = useState<'email' | 'recovery'>(mailReady ? 'email' : 'recovery');
  const [stage, setStage] = useState<'ask' | 'code' | 'done'>('ask');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(url: string, body: unknown, onOk: () => void) {
    setError('');
    setBusy(true);
    const r = await send(url, body);
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? '操作失敗');
    onOk();
  }

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    void run('/api/auth/forgot', { identifier }, () => setStage('code'));
  }

  function finish(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError('兩次輸入的密碼不一致');
    if (mode === 'email') void run('/api/auth/reset', { identifier, code, newPassword: pw }, () => setStage('done'));
    else void run('/api/auth/recover', { identifier, recoveryCode: code, newPassword: pw }, () => setStage('done'));
  }

  if (stage === 'done') {
    return (
      <AuthShell title="密碼已更新" subtitle="所有裝置已登出，請用新密碼登入。">
        <Link href="/login" className="inline-flex w-full items-center justify-center rounded-lg bg-ballpoint px-4 py-2.5 font-semibold text-white hover:bg-ballpoint-dark">
          前往登入
        </Link>
      </AuthShell>
    );
  }

  const tabs = (
    <div className="mb-5 flex gap-2" role="tablist">
      {mailReady && (
        <button type="button" role="tab" aria-selected={mode === 'email'} onClick={() => { setMode('email'); setStage('ask'); setError(''); }} className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${mode === 'email' ? 'border-ballpoint bg-ballpoint-tint' : 'border-line bg-white'}`}>
          電郵驗證碼
        </button>
      )}
      <button type="button" role="tab" aria-selected={mode === 'recovery'} onClick={() => { setMode('recovery'); setStage('ask'); setError(''); }} className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${mode === 'recovery' ? 'border-ballpoint bg-ballpoint-tint' : 'border-line bg-white'}`}>
        管理員恢復碼
      </button>
    </div>
  );

  return (
    <AuthShell title="忘記密碼" subtitle={mailReady ? '我們會把驗證碼發到你登記的電郵。' : '郵件服務尚未啟用。管理員可用設定時保存的恢復碼重設；其他用戶請聯絡管理員。'}>
      {tabs}
      {mode === 'email' && stage === 'ask' && (
        <form onSubmit={sendCode} className="space-y-4">
          <Field label="用戶名或電郵" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoCapitalize="none" required />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? '發送中…' : '發送驗證碼'}
          </Button>
        </form>
      )}
      {(mode === 'recovery' || stage === 'code') && (
        <form onSubmit={finish} className="space-y-4">
          {mode === 'email' ? (
            <Alert kind="info">如果帳號存在且已驗證電郵，驗證碼已發出（10 分鐘內有效）。沒收到請檢查垃圾郵件匣。</Alert>
          ) : (
            <Field label="用戶名或電郵" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoCapitalize="none" required />
          )}
          <Field
            label={mode === 'email' ? '6 位數驗證碼' : '恢復碼'}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode={mode === 'email' ? 'numeric' : 'text'}
            autoComplete="one-time-code"
            placeholder={mode === 'email' ? '123456' : 'XXXX-XXXX-XXXX'}
            required
          />
          <Field label="新密碼" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
          <Field label="確認新密碼" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? '處理中…' : '重設密碼'}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-ballpoint underline underline-offset-2">
          返回登入
        </Link>
      </p>
    </AuthShell>
  );
}
