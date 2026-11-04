'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

export function BindForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await send('/api/parent/bind', { code });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '綁定失敗');
    setCode('');
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1"><Field label="家長綁定碼" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" autoCapitalize="characters" autoComplete="off" required /></div>
      <Button type="submit" disabled={busy}>綁定</Button>
      {err && <div className="w-full"><Alert>{err}</Alert></div>}
    </form>
  );
}
