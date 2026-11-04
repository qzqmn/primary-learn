'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { Alert, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

type Cred = { nickname: string; password: string; note?: string };

function Qr({ text }: { text: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(setSvg).catch(() => setSvg(''));
  }, [text]);
  return <div className="size-20 shrink-0 [&_svg]:size-full" aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** 初始密碼只在建立／重設的這一刻能看到（資料庫只存雜湊），所以要即時列印或抄下 */
export function Credentials({ items, joinCode, title = '請現在列印或抄下登入資料' }: { items: Cred[]; joinCode: string; title?: string }) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return (
    <div className="space-y-3 rounded-xl border-2 border-hi bg-hi/30 p-4">
      <style>{`@media print{body *{visibility:hidden}.print-area,.print-area *{visibility:visible}.print-area{position:absolute;left:0;top:0;width:100%}.no-print{display:none!important}}`}</style>
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{title}</p>
        <Button variant="ghost" onClick={() => window.print()}>列印登入卡</Button>
      </div>
      <p className="no-print text-sm">離開此頁後就看不到密碼；如忘記，可以按「重設密碼」重新產生。</p>
      <div className="print-area grid gap-3 sm:grid-cols-2">
        {items.map((c) => (
          <div key={c.nickname} className="flex gap-3 break-inside-avoid rounded-lg border-2 border-ink bg-white p-3">
            <Qr text={`${origin}/login?t=student&c=${encodeURIComponent(joinCode)}&n=${encodeURIComponent(c.nickname)}`} />
            <dl className="min-w-0 text-sm leading-6">
              <div className="truncate text-base font-bold">{c.nickname}</div>
              <div>班級代碼 <b className="font-mono tracking-widest">{joinCode}</b></div>
              <div>密碼 <b className="font-mono text-base">{c.password}</b></div>
              <div className="truncate text-xs text-ink-soft">{origin.replace(/^https?:\/\//, '')}</div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AddStudents({ classId, joinCode }: { classId: string; joinCode: string }) {
  const router = useRouter();
  const [nick, setNick] = useState('');
  const [csv, setCsv] = useState('');
  const [mode, setMode] = useState<'one' | 'csv'>('one');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [created, setCreated] = useState<Cred[]>([]);
  const [failed, setFailed] = useState<{ line: string; reason: string }[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await send(`/api/classes/${classId}/students`, mode === 'one' ? { nickname: nick } : { csv });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '新增失敗');
    setCreated((c) => [...c, ...(r.data.created as Cred[])]);
    setFailed(r.data.failed ?? []);
    setNick('');
    if (mode === 'csv') setCsv('');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="tablist" aria-label="新增方式">
        {(['one', 'csv'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${mode === m ? 'border-ballpoint bg-ballpoint text-white' : 'border-line bg-white'}`}>
            {m === 'one' ? '逐個新增' : '批量匯入'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'one' ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1"><Field label="學生暱稱" value={nick} onChange={(e) => setNick(e.target.value)} hint="請用暱稱或學號，不要用真名" maxLength={12} required /></div>
            <Button type="submit" disabled={busy}>新增</Button>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">每行一位：「暱稱」或「暱稱,備註」</span>
              <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} placeholder={'小熊\n阿虎,學號03\n星星,學號04'} className="w-full rounded-lg border-2 border-line px-3 py-2 font-mono text-sm outline-none focus:border-ballpoint" required />
              <span className="mt-1 block text-xs text-ink-soft">可直接貼上試算表的兩欄內容（暱稱、備註）。一次最多 200 位。</span>
            </label>
            <Button type="submit" disabled={busy}>{busy ? '匯入中…' : '匯入'}</Button>
          </>
        )}
        {err && <Alert>{err}</Alert>}
      </form>
      {failed.length > 0 && (
        <Alert>
          有 {failed.length} 行未能建立：
          <ul className="mt-1 list-disc pl-5">{failed.map((f, i) => <li key={i}>{f.line}：{f.reason}</li>)}</ul>
        </Alert>
      )}
      {created.length > 0 && <Credentials items={created} joinCode={joinCode} />}
    </div>
  );
}

export function ClassSettings({ cls }: { cls: { id: string; name: string; joinMode: 'closed' | 'approval' | 'auto'; archived: boolean; joinCode: string } }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  async function patch(body: object) {
    setErr('');
    const r = await send(`/api/classes/${cls.id}`, body, 'PATCH');
    if (!r.ok) return setErr(r.data.error ?? '更新失敗');
    router.refresh();
  }
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="mb-1 block font-semibold">學生自助加入</span>
        <select value={cls.joinMode} onChange={(e) => patch({ joinMode: e.target.value })} className="w-full max-w-sm rounded-lg border-2 border-line bg-white px-3 py-2 text-base">
          <option value="closed">關閉：只由老師建立學生（最安全）</option>
          <option value="approval">開放，但需老師批准</option>
          <option value="auto">開放，加入即可使用</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => confirm('更換後，舊的班級代碼和已列印的登入卡 QR 都會失效。確定嗎？') && patch({ regenerateCode: true })}>更換班級代碼</Button>
        <Button variant="ghost" onClick={() => patch({ archived: !cls.archived })}>{cls.archived ? '取消封存' : '封存班級'}</Button>
      </div>
      {err && <Alert>{err}</Alert>}
    </div>
  );
}

export function StudentActions({ s, joinCode }: { s: { id: string; nickname: string; status: string }; joinCode: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<React.ReactNode>(null);
  const [cred, setCred] = useState<Cred | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(action: string, ok?: string) {
    setBusy(true);
    const r = await send(`/api/students/${s.id}`, { action }, 'PATCH');
    setBusy(false);
    if (!r.ok) return setMsg(<span className="text-pen">{r.data.error ?? '操作失敗'}</span>);
    if (action === 'reset_password') setCred({ nickname: s.nickname, password: r.data.password });
    else setMsg(ok ?? '已更新');
    router.refresh();
  }
  async function bind() {
    setBusy(true);
    const r = await send(`/api/students/${s.id}/bind-code`, {});
    setBusy(false);
    setMsg(r.ok ? <span>家長綁定碼：<b className="font-mono text-base tracking-widest">{r.data.code}</b>（7 天內有效，只能用一次）</span> : <span className="text-pen">{r.data.error}</span>);
  }
  async function del() {
    if (!confirm(`確定徹底刪除「${s.nickname}」及其所有學習記錄？此操作無法還原。`)) return;
    setBusy(true);
    const r = await send(`/api/students/${s.id}`, undefined, 'DELETE');
    setBusy(false);
    if (!r.ok) return setMsg(<span className="text-pen">{r.data.error}</span>);
    router.refresh();
  }
  const b = 'rounded border border-line bg-white px-2 py-1 text-xs font-semibold hover:border-ballpoint disabled:opacity-50';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {s.status === 'pending' && <button disabled={busy} className={b} onClick={() => act('approve', '已批准')}>批准</button>}
        <button disabled={busy} className={b} onClick={() => confirm(`重設「${s.nickname}」的密碼？`) && act('reset_password')}>重設密碼</button>
        <button disabled={busy} className={b} onClick={bind}>家長綁定碼</button>
        {s.status === 'disabled' ? <button disabled={busy} className={b} onClick={() => act('enable', '已啟用')}>啟用</button> : <button disabled={busy} className={b} onClick={() => act('disable', '已停用')}>停用</button>}
        <button disabled={busy} className={`${b} text-pen`} onClick={del}>刪除</button>
      </div>
      {msg && <p className="text-xs" role="status">{msg}</p>}
      {cred && <Credentials items={[cred]} joinCode={joinCode} title="新密碼（只顯示一次）" />}
    </div>
  );
}

export function AssignmentForm({ classId, units }: { classId: string; units: { id: string; label: string }[] }) {
  const router = useRouter();
  const [unitId, setUnitId] = useState(units[0]?.id ?? '');
  const [count, setCount] = useState(10);
  const [due, setDue] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const dueAt = due ? new Date(`${due}T23:59:00+08:00`).getTime() : null;
    const r = await send(`/api/classes/${classId}/assignments`, { unitId, count, dueAt });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '派發失敗');
    setDue('');
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="block min-w-56 flex-1">
        <span className="mb-1 block text-sm font-semibold">單元</span>
        <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="w-full rounded-lg border-2 border-line bg-white px-3 py-2.5 text-base">
          {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">題數</span>
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-lg border-2 border-line bg-white px-3 py-2.5 text-base">
          {[5, 10, 15, 20].map((n) => <option key={n}>{n}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">限期（可不填）</span>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="rounded-lg border-2 border-line bg-white px-3 py-2 text-base" />
      </label>
      <Button type="submit" disabled={busy}>派發功課</Button>
      {err && <div className="w-full"><Alert>{err}</Alert></div>}
    </form>
  );
}

export function DeleteAssignment({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button className="text-xs font-semibold text-pen underline underline-offset-2" onClick={async () => { if (confirm('刪除這份功課？學生的練習記錄會保留。')) { await send(`/api/assignments/${id}`, undefined, 'DELETE'); router.refresh(); } }}>
      刪除
    </button>
  );
}
