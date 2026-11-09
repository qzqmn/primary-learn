'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AuthShell, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

type Setup = { enabled: boolean; secret?: string; otpauthUrl?: string; enabledAt?: number };

export default function TotpPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const r = await send('/api/account/totp', undefined, 'GET');
    if (r.status === 401) return router.replace('/login');
    if (!r.ok) return setError(r.data.error ?? '載入失敗');
    setSetup({ enabled: !!r.data.enabled, secret: r.data.secret, otpauthUrl: r.data.otpauthUrl, enabledAt: r.data.enabledAt });
  }, [router]);
  useEffect(() => {
    void load();
  }, [load]);

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    setBusy('enable');
    const r = await send('/api/account/totp', { code });
    setBusy('');
    if (!r.ok) return setError(r.data.error ?? '啟用失敗');
    setMsg('二步驗證已啟用，之後登入需要輸入驗證碼。');
    setCode('');
    await load();
  }

  async function disable() {
    if (!confirm('停用二步驗證後，登入將不再需要驗證碼。確定停用？')) return;
    setError('');
    setMsg('');
    setBusy('disable');
    const r = await send('/api/account/totp', undefined, 'DELETE');
    setBusy('');
    if (!r.ok) return setError(r.data.error ?? '停用失敗');
    setMsg('二步驗證已停用。');
    await load();
  }

  return (
    <AuthShell title="二步驗證" subtitle="管理員與老師可為帳號加設一次性驗證碼，提升後台安全。">
      {error && <Alert>{error}</Alert>}
      {msg && <Alert kind="ok">{msg}</Alert>}
      {!setup && !error && <p className="text-ink-soft">載入中…</p>}
      {setup?.enabled && (
        <div className="space-y-4">
          <Alert kind="ok">此帳號已啟用二步驗證，登入時須輸入驗證應用程式上的 6 位驗證碼。</Alert>
          <Button type="button" variant="danger" onClick={disable} disabled={!!busy}>
            {busy === 'disable' ? '處理中…' : '停用二步驗證'}
          </Button>
        </div>
      )}
      {setup && !setup.enabled && (
        <div className="space-y-4">
          <Alert kind="info">
            請用 Google Authenticator、Authy、1Password 等支援 TOTP 的應用程式掃描或輸入以下密鑰。密鑰只會在本頁顯示，請勿與他人分享。
          </Alert>
          <div className="rounded-lg border-2 border-line bg-paper p-3">
            <p className="text-sm font-semibold">設定密鑰</p>
            <p className="mt-1 break-all font-mono text-base tracking-wider">{setup.secret}</p>
            <p className="mt-3 text-sm font-semibold">設定連結（otpauth://）</p>
            <p className="mt-1 break-all font-mono text-xs text-ink-soft">{setup.otpauthUrl}</p>
          </div>
          <form onSubmit={enable} className="space-y-4">
            <Field
              label="驗證應用程式顯示的 6 位數字"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="例：482 913"
              maxLength={6}
              required
            />
            <p className="text-xs text-ink-soft">驗證碼每 30 秒更新一次；系統容許前後一個時間區間的誤差。</p>
            <Button type="submit" disabled={!!busy} className="w-full">
              {busy === 'enable' ? '驗證中…' : '驗證並啟用'}
            </Button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
