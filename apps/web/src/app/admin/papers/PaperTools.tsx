'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@/components/ui';
import { Card, Empty, Table, hk } from '@/components/kit';
import { SUBJECT_LABEL } from '@/lib/content/types';
import { send } from '@/lib/client';

type Subject = 'math' | 'english' | 'chinese' | 'general';
type Kind = 'original' | 'licensed' | 'index' | 'private';
type Status = 'draft' | 'pending' | 'approved' | 'rejected';
type Visibility = 'private' | 'class' | 'public';

type Item = {
  id: string;
  title: string;
  subject: Subject;
  grade: number;
  ownerId: string;
  ownerName: string;
  kind: Kind;
  status: Status;
  visibility: Visibility;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
  retrievedAt: string | null;
  adaptationNote: string | null;
  questionCount: number;
  timeLimitMin: number | null;
  pointsPerQuestion: number;
  createdAt: number;
  reviewedBy: string | null;
  reviewedAt: number | null;
  reviewNote: string | null;
};

const KIND_LABEL: Record<Kind, string> = { original: '教師原創', licensed: '開放授權', index: '外連索引', private: '私人原創' };
const STATUS_LABEL: Record<Status, string> = { draft: '草稿', pending: '待審核', approved: '已通過', rejected: '已退回' };
const VIS_LABEL: Record<Visibility, string> = { private: '私人', class: '班級', public: '公開' };
const SUBJECTS: Subject[] = ['math', 'english', 'chinese', 'general'];
const btn = 'rounded border border-line bg-white px-2 py-1 text-xs font-semibold hover:border-ballpoint disabled:opacity-50';
const selectCls = 'w-full rounded-lg border-2 border-line bg-white px-3 py-2.5 text-base';

const ORIGINAL_TEMPLATE = JSON.stringify({
  title: 'P3 數學 單元測驗（原創）',
  subject: 'math',
  grade: 3,
  kind: 'original',
  visibility: 'class',
  adaptationNote: '本人聲明：本卷由本人自行出題，沒有收錄任何第三方試卷題目。',
  timeLimitMin: 30,
  pointsPerQuestion: 10,
  questions: [
    { type: 'choice', prompt: '3 + 5 = ？', choices: ['6', '7', '8', '9'], answer: '8', tag: '加法' },
    { type: 'number', prompt: '12 − 4 = ？', answer: '8', tag: '減法' },
    { type: 'text', prompt: '一打等於多少件？', answer: '12', accept: ['十二'], tag: '數量單位' },
  ],
}, null, 2);

const LICENSED_TEMPLATE = JSON.stringify({
  title: 'P4 常識 開卷練習（CC BY 4.0）',
  subject: 'general',
  grade: 4,
  kind: 'licensed',
  visibility: 'public',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://example.org/open-questions',
  retrievedAt: '2026-11-09',
  adaptationNote: '依原題翻譯為繁體中文並調整選項順序；原題以 CC BY 4.0 授權。',
  timeLimitMin: 25,
  pointsPerQuestion: 10,
  questions: [
    { type: 'choice', prompt: '下列哪一項是可再生能源？', choices: ['煤', '石油', '太陽能', '天然氣'], answer: '太陽能', tag: '能源' },
  ],
}, null, 2);

/** 上傳「教師原創」或「明確開放授權」卷：貼上／挑選單一 JSON，直接 POST /api/papers */
function UploadJson({ onCreated }: { onCreated: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; t: string } | null>(null);

  async function submit() {
    setBusy(true);
    setRes(null);
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      setRes({ ok: false, t: '不是有效的 JSON，請檢查格式' });
      setBusy(false);
      return;
    }
    const r = await send('/api/papers', payload);
    setBusy(false);
    if (!r.ok) return setRes({ ok: false, t: r.data.error ?? '建立失敗' });
    setRes({ ok: true, t: '已建立試卷，狀態為「待審核」，須由管理員覆核後才會對學生公開。' });
    setText('');
    if (file.current) file.current.value = '';
    onCreated();
  }

  return (
    <div className="space-y-3">
      <Alert kind="info">
        貼上或選擇<b>單一試卷</b>的 JSON。<b>原創卷</b>須有 <code>adaptationNote</code> 原創聲明（或 <code>ownerDeclaration: true</code>）；<b>開放授權卷</b>須有 <code>license</code>、<code>licenseUrl</code>、<code>retrievedAt</code>。題目只接受 choice／text／number 三型。<b>不提供任何爬蟲或批次匯入</b>，每次只建立一張卷。
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={() => { setText(ORIGINAL_TEMPLATE); setRes(null); }}>載入原創範本</Button>
        <Button type="button" variant="ghost" onClick={() => { setText(LICENSED_TEMPLATE); setRes(null); }}>載入開放授權範本</Button>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">選擇 .json 檔（或直接在下方貼上）</span>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); setRes(null); } }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-2 file:border-line file:bg-white file:px-3 file:py-2 file:font-semibold"
        />
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder="貼上試卷 JSON…"
        className="w-full rounded-lg border-2 border-line p-3 font-mono text-xs outline-none focus:border-ballpoint"
      />
      <Button type="button" onClick={submit} disabled={busy || !text.trim()}>{busy ? '建立中…' : '建立試卷'}</Button>
      {res && <Alert kind={res.ok ? 'ok' : 'error'}>{res.t}</Alert>}
    </div>
  );
}

/** 建立索引卷：只存外連、不存題目 */
function IndexForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<Subject>('math');
  const [grade, setGrade] = useState('1');
  const [sourceUrl, setSourceUrl] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('class');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; t: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setRes(null);
    const r = await send('/api/papers', { kind: 'index', title, subject, grade: Number(grade), sourceUrl, visibility, questions: [] });
    setBusy(false);
    if (!r.ok) return setRes({ ok: false, t: r.data.error ?? '建立失敗' });
    setRes({ ok: true, t: '已建立索引卷（只存外連、沒有題目），狀態為「待審核」。' });
    setTitle('');
    setSourceUrl('');
    onCreated();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Alert kind="info">
        索引卷<b>只儲存原站連結，系統不會儲存任何題目</b>。適用於不便或不獲授權複製題目、只提供外部連結的情況。<b>切勿把題目內容貼進本系統</b>；學生只會看到「前往原站」。
      </Alert>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="試卷標題" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">科目</span>
          <select value={subject} onChange={(e) => setSubject(e.target.value as Subject)} className={selectCls}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">年級</span>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className={selectCls}>
            {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>P{g}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">可見範圍</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)} className={selectCls}>
            <option value="private">私人（只有自己／管理員）</option>
            <option value="class">班級（通過後所屬班級學生可見）</option>
            <option value="public">公開（通過後所有學生可見）</option>
          </select>
        </label>
      </div>
      <Field label="原站連結（sourceUrl）" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" required hint="只存連結，不存題目；學生會看到「前往原站」外連。" />
      <Button type="submit" disabled={busy || !sourceUrl.trim()}>{busy ? '建立中…' : '建立索引卷'}</Button>
      {res && <Alert kind={res.ok ? 'ok' : 'error'}>{res.t}</Alert>}
    </form>
  );
}

/** 每列操作：管理員審核通過／退回（可填備註），擁有者或管理員可刪除 */
function RowActions({ p, isAdmin, currentUserId, onChanged }: { p: Item; isAdmin: boolean; currentUserId: string; onChanged: () => void }) {
  const [open, setOpen] = useState<null | 'approved' | 'rejected'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const canEdit = isAdmin || p.ownerId === currentUserId;

  async function review() {
    if (!open) return;
    setBusy(true);
    setErr('');
    const r = await send(`/api/papers/${p.id}/review`, { decision: open, reviewNote: note || undefined });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '審核失敗');
    setOpen(null);
    setNote('');
    onChanged();
  }
  async function del() {
    if (!confirm(`確定刪除試卷「${p.title}」？學生的作答記錄會保留。`)) return;
    setBusy(true);
    const r = await send(`/api/papers/${p.id}`, undefined, 'DELETE');
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? '刪除失敗');
    onChanged();
  }

  return (
    <div className="flex min-w-40 flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {isAdmin && p.status !== 'approved' && <button disabled={busy} className={btn} onClick={() => { setOpen('approved'); setNote(''); setErr(''); }}>通過</button>}
        {isAdmin && p.status !== 'rejected' && <button disabled={busy} className={btn} onClick={() => { setOpen('rejected'); setNote(''); setErr(''); }}>退回</button>}
        {canEdit && <button disabled={busy} className={`${btn} text-pen`} onClick={del}>刪除</button>}
        {!isAdmin && !canEdit && <span className="text-xs text-ink-soft">只供檢視</span>}
      </div>
      {open && (
        <div className="mt-1 space-y-1">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="審核備註（可留空）" maxLength={500} className="w-full rounded border-2 border-line px-2 py-1 text-xs" />
          <div className="flex gap-1">
            <button disabled={busy} className={`${btn} bg-ballpoint text-white`} onClick={review}>確認{open === 'approved' ? '通過' : '退回'}</button>
            <button className={btn} onClick={() => setOpen(null)}>取消</button>
          </div>
        </div>
      )}
      {err && <p className="text-xs text-pen">{err}</p>}
    </div>
  );
}

export function PaperTools({ papers, isAdmin, currentUserId }: { papers: Item[]; isAdmin: boolean; currentUserId: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">試卷管理</h1>

      <Alert kind="error">
        <p className="font-bold">法律與合規底線（必讀）</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed">
          <li>本系統<b>只接受三類</b>試卷：① 教師自出<b>原創卷</b>；② 明確標示 <b>CC0／CC BY／CC BY-SA</b> 等、允許改作與再發布的<b>開放授權卷</b>（須填授權條文連結與取用日期）；③ <b>只存外連索引、不存題目</b>的卷。</li>
          <li><b>嚴禁匯入任何第三方試卷</b>：NC（非商業）／ND（禁止改作）／無授權、課本、TSA、商業及補習社試卷一律拒絕，並在建立時寫明原因；<b>不提供任何爬蟲或批次匯入</b>。</li>
          <li>索引卷只存原站連結，系統不會儲存題目；其餘卷的題目一經建立即存於本機資料庫，請自行確認來源授權真實、沒有版權與個資風險。</li>
          <li>新卷一律為「待審核」，須由管理員覆核通過才對學生公開；API 會再次核驗 <code>licenseAllowed()</code> 與必要欄位，<b>後台自填的授權不會被信任</b>。</li>
        </ul>
      </Alert>

      <p className="text-sm text-ink-soft">學生瀏覽位置：<code>/learn/papers</code>（可把此連結提供予學生；學生導覽列不在本次可修改範圍）。</p>

      <Card title="試卷列表（狀態・授權・來源）">
        {papers.length === 0 ? (
          <Empty>還沒有試卷。用下方表單建立第一張。</Empty>
        ) : (
          <Table head={['試卷', '類型', '狀態', '授權', '來源', '題數', '可見', '建立', '操作']}>
            {papers.map((p) => (
              <tr key={p.id} className="align-top">
                <td>
                  <span className="font-semibold">{p.title}</span>
                  <span className="block text-xs text-ink-soft">P{p.grade} {SUBJECT_LABEL[p.subject]} · {p.ownerName}</span>
                </td>
                <td className="whitespace-nowrap">{KIND_LABEL[p.kind]}</td>
                <td className="whitespace-nowrap">
                  <span className={p.status === 'approved' ? 'font-semibold text-ok' : p.status === 'rejected' ? 'font-semibold text-pen' : ''}>{STATUS_LABEL[p.status]}</span>
                  {p.reviewNote && <span className="block text-xs text-ink-soft">備註：{p.reviewNote}</span>}
                  {p.reviewedAt && <span className="block text-xs text-ink-soft">{hk(p.reviewedAt, false)}</span>}
                </td>
                <td className="max-w-40 text-xs">
                  {p.license || '—'}
                  {p.licenseUrl && <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer" className="block text-ballpoint underline underline-offset-2">授權條款</a>}
                  {p.retrievedAt && <span className="block text-ink-soft">取用 {p.retrievedAt}</span>}
                </td>
                <td className="max-w-40 break-words text-xs">
                  {p.sourceUrl ? (
                    <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-ballpoint underline underline-offset-2">{p.kind === 'index' ? '原站外連' : '原始來源'}</a>
                  ) : p.adaptationNote ? <span className="line-clamp-2">{p.adaptationNote}</span> : '—'}
                </td>
                <td className="tabular-nums">{p.questionCount}</td>
                <td className="whitespace-nowrap">{VIS_LABEL[p.visibility]}</td>
                <td className="whitespace-nowrap text-xs">{hk(p.createdAt, false)}</td>
                <td><RowActions p={p} isAdmin={isAdmin} currentUserId={currentUserId} onChanged={refresh} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="上傳原創或開放授權卷（JSON）"><UploadJson onCreated={refresh} /></Card>
      <Card title="建立索引卷（只存外連、不存題目）"><IndexForm onCreated={refresh} /></Card>
    </div>
  );
}
