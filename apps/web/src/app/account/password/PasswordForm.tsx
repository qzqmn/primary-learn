'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AuthShell, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

export function PasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError('兩次輸入的密碼不一致');
    setError('');
    setBusy(true);
    const r = await send('/api/account/password', { currentPassword: cur, newPassword: pw });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? '更改失敗');
    router.push('/');
    router.refresh();
  }

  return (
    <AuthShell title="更改密碼" subtitle={forced ? '這是臨時密碼，請先設定你自己的新密碼才能繼續。' : '更改後，其他裝置會自動登出。'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="目前的密碼" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
        <Field label="新密碼" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
        <Field label="確認新密碼" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? '儲存中…' : '儲存新密碼'}
        </Button>
      </form>
    </AuthShell>
  );
}
