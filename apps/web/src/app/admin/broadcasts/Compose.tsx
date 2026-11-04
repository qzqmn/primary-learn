'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

type Role = 'teacher' | 'parent' | 'student';
const ROLE_LABEL: Record<Role, string> = { teacher: '老師', parent: '家長', student: '學生' };

export function Compose({ role, classes, mailReady }: { role: 'admin' | 'teacher'; classes: { id: string; name: string }[]; mailReady: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'roles' | 'classes'>(role === 'admin' ? 'all' : 'classes');
  const [roles, setRoles] = useState<Role[]>(['student', 'parent']);
  const [classIds, setClassIds] = useState<string[]>(classes.map((c) => c.id));
  const [sendEmail, setSendEmail] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [days, setDays] = useState<number | null>(14);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; t: string } | null>(null);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setRes(null);
    const audience = target === 'all' ? { all: true } : target === 'roles' ? { roles } : { classIds, roles: role === 'admin' ? ['student', 'parent'] : undefined };
    const r = await send('/api/broadcasts', { title, body, audience, sendEmail, pinned, expiresInDays: days });
    setBusy(false);
    if (!r.ok) return setRes({ ok: false, t: r.data.error ?? '發送失敗' });
    setRes({ ok: true, t: `已發送給 ${r.data.recipients} 人${sendEmail ? `，其中 ${r.data.emailsQueued} 封電郵已排隊發送` : ''}` });
    setTitle('');
    setBody('');
    router.refresh();
  }

  const box = 'flex items-center gap-2';
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">發送給</legend>
        {role === 'admin' && (
          <>
            <label className={box}><input type="radio" checked={target === 'all'} onChange={() => setTarget('all')} /> 所有老師、家長和學生</label>
            <label className={box}><input type="radio" checked={target === 'roles'} onChange={() => setTarget('roles')} /> 按身份</label>
          </>
        )}
        <label className={box}><input type="radio" checked={target === 'classes'} onChange={() => setTarget('classes')} /> {role === 'admin' ? '指定班級的學生和家長' : '我的班級的學生和已綁定的家長'}</label>
        {target === 'roles' && (
          <div className="flex gap-4 pl-6">
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <label key={r} className={box}><input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles(toggle(roles, r))} /> {ROLE_LABEL[r]}</label>
            ))}
          </div>
        )}
        {target === 'classes' && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
            {classes.length === 0 && <span className="text-sm text-ink-soft">還沒有班級</span>}
            {classes.map((c) => (
              <label key={c.id} className={box}><input type="checkbox" checked={classIds.includes(c.id)} onChange={() => setClassIds(toggle(classIds, c.id))} /> {c.name}</label>
            ))}
          </div>
        )}
      </fieldset>

      <Field label="標題" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} required />
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">內容</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} required className="w-full rounded-lg border-2 border-line px-3 py-2 text-base outline-none focus:border-ballpoint" />
        <span className="text-xs text-ink-soft">純文字，{body.length} / 2000。學生只會在網站內看到通知。</span>
      </label>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className={box}><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> 置頂</label>
        <label className={box}>
          顯示
          <select value={days ?? 0} onChange={(e) => setDays(Number(e.target.value) || null)} className="rounded border-2 border-line bg-white px-2 py-1">
            <option value={3}>3 日</option><option value={7}>7 日</option><option value={14}>14 日</option><option value={30}>30 日</option><option value={0}>不限期</option>
          </select>
        </label>
        <label className={`${box} ${mailReady ? '' : 'opacity-50'}`}>
          <input type="checkbox" checked={sendEmail} disabled={!mailReady} onChange={(e) => setSendEmail(e.target.checked)} /> 同時發電郵（老師和家長）
        </label>
      </div>
      {!mailReady && <p className="text-xs text-ink-soft">電郵廣播需要先在「郵件服務」完成設定。</p>}
      {sendEmail && <Alert kind="info">電郵會經 Resend 發出，並計入每日發送上限。電郵不放學生成績，只放你寫的內容。</Alert>}
      {res && <Alert kind={res.ok ? 'ok' : 'error'}>{res.t}</Alert>}
      <Button type="submit" disabled={busy}>{busy ? '發送中…' : '發送'}</Button>
    </form>
  );
}
