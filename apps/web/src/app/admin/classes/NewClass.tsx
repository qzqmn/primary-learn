'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

export function NewClass() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(1);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await send('/api/classes', { name, grade });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '建立失敗');
    router.push(`/admin/classes/${r.data.id}`);
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-40 flex-1"><Field label="班別名稱" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：3A" maxLength={20} required /></div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">年級</span>
        <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="rounded-lg border-2 border-line bg-white px-3 py-2.5 text-base">
          {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>P{g}</option>)}
        </select>
      </label>
      <Button type="submit" disabled={busy}>{busy ? '建立中…' : '新增班級'}</Button>
      {err && <div className="w-full"><Alert>{err}</Alert></div>}
    </form>
  );
}
