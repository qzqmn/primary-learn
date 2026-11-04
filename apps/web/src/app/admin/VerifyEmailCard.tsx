'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

export function VerifyEmailCard({ email }: { email: string }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setError('');
    setBusy(true);
    const r = await send('/api/account/email-verify', { action: 'send' });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? '發送失敗');
    setSent(true);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const r = await send('/api/account/email-verify', { action: 'confirm', code });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? '驗證失敗');
    router.refresh();
  }

  if (!sent) {
    return (
      <div className="space-y-2">
        <p>
          我們會把 6 位驗證碼發到 <strong className="text-ink">{email}</strong>。
        </p>
        {error && <Alert>{error}</Alert>}
        <Button onClick={sendCode} disabled={busy}>
          {busy ? '發送中…' : '發送驗證碼'}
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={confirm} className="space-y-3">
      <Field label="驗證碼" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required />
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          確認
        </Button>
        <Button type="button" variant="ghost" onClick={sendCode} disabled={busy}>
          重新發送
        </Button>
      </div>
    </form>
  );
}
