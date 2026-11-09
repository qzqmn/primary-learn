'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@/components/ui';
import { Card, Table } from '@/components/kit';
import { SUBJECT_LABEL } from '@/lib/content/types';
import { send } from '@/lib/client';

type Cell = { subject: string; grade: number; units: number; questions: number };
type Preview = {
  name: string;
  version: number;
  license: string;
  licenseUrl: string | null;
  retrievedAt: string | null;
  adaptationNote: string | null;
  sourceUrl: string | null;
  licenseOk: boolean;
  nameTaken: boolean;
  conflicts: string[];
  dupInPack: boolean;
  totalUnits: number;
  totalQuestions: number;
  cells: Cell[];
  samples: string[];
};

/** A1：選檔後先呼叫 /validate 顯示預覽與警告，按「確認上傳」才真正 POST。 */
export function PackTools() {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; t: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fileText, setFileText] = useState('');

  function clear() {
    setPreview(null);
    setFileText('');
    setRes(null);
    if (file.current) file.current.value = '';
  }

  async function validateFile(f: File) {
    setPreview(null);
    setRes(null);
    setPreviewBusy(true);
    try {
      const text = await f.text();
      const r = await fetch('/api/admin/content/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: text });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRes({ ok: false, t: d.error ?? `驗證失敗（${r.status}）` });
        return;
      }
      setPreview(d as Preview);
      setFileText(text);
    } catch {
      setRes({ ok: false, t: '驗證失敗，請檢查網絡' });
    }
    setPreviewBusy(false);
  }

  async function confirmUpload() {
    if (!fileText) return;
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch('/api/admin/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: fileText });
      const d = await r.json().catch(() => ({}));
      setRes(r.ok ? { ok: true, t: `已加入「${d.name}」：${d.units} 個單元、${d.questions} 題` } : { ok: false, t: d.error ?? `上傳失敗（${r.status}）` });
      if (r.ok) {
        setPreview(null);
        setFileText('');
        if (file.current) file.current.value = '';
        router.refresh();
      }
    } catch {
      setRes({ ok: false, t: '上傳失敗，請檢查網絡' });
    }
    setBusy(false);
  }

  const warnings: string[] = [];
  if (preview) {
    if (!preview.licenseOk) warnings.push(`授權「${preview.license}」不被接受；只收 CC0、CC BY、CC BY-SA、MIT、Apache-2.0、BSD、ISC、Unlicense 或原創內容。`);
    if (preview.nameTaken) warnings.push(`已有同名內容包「${preview.name}」，確認上傳會被拒絕，請先刪除舊的。`);
    if (preview.conflicts.length) warnings.push(`以下單元 ID 已被現有題庫使用，確認上傳會被拒絕：${preview.conflicts.join('、')}`);
    if (preview.dupInPack) warnings.push('同一個內容包內有重複的單元 ID，確認上傳會被拒絕。');
  }

  return (
    <div className="space-y-3">
      <Alert kind="info">
        內容包必須註明<b>授權</b>（<code>license</code>）。只接受 CC0、CC BY、CC BY-SA、MIT、Apache-2.0、BSD、ISC、Unlicense 或原創內容；不接受 NC／ND 或沒有授權的內容。請自行確認來源真的使用該授權，並核對題目答案正確、符合年級——<b>上傳後學生馬上會看到</b>。格式見 docs/content-packs.md。
      </Alert>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">內容包檔案（.json）</span>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) validateFile(f); }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-2 file:border-line file:bg-white file:px-3 file:py-2 file:font-semibold"
        />
      </label>
      {previewBusy && <p className="text-sm text-ink-soft">正在驗證並產生預覽…</p>}

      {preview && (
        <div className="space-y-3">
          {warnings.length > 0 && (
            <Alert kind="error">
              <p className="font-bold">上傳前警告</p>
              <ul className="mt-1 list-disc pl-5">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </Alert>
          )}
          <Card title={`預覽：${preview.name}`}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-semibold">版本</dt><dd>{preview.version}</dd>
              <dt className="font-semibold">授權</dt><dd>{preview.license}{preview.licenseOk ? '' : '（不被接受）'}</dd>
              <dt className="font-semibold">單元／題數</dt><dd>{preview.totalUnits} 個單元、{preview.totalQuestions} 題</dd>
              <dt className="font-semibold">授權條款</dt><dd>{preview.licenseUrl ? <a href={preview.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-ballpoint underline underline-offset-2">{preview.licenseUrl}</a> : '—'}</dd>
              <dt className="font-semibold">原始來源</dt><dd>{preview.sourceUrl ? <a href={preview.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-ballpoint underline underline-offset-2">{preview.sourceUrl}</a> : '—'}</dd>
              <dt className="font-semibold">取用日期</dt><dd>{preview.retrievedAt ?? '—'}</dd>
              <dt className="font-semibold">改編說明</dt><dd>{preview.adaptationNote ?? '—'}</dd>
            </dl>
            <h3 className="mt-3 text-sm font-bold">各年級／科目分佈</h3>
            <Table head={['科目', '年級', '單元數', '題數']}>
              {preview.cells.map((c) => (
                <tr key={`${c.subject}-${c.grade}`}>
                  <td>{(SUBJECT_LABEL as unknown as Record<string, string>)[c.subject] ?? c.subject}</td>
                  <td className="tabular-nums">P{c.grade}</td>
                  <td className="tabular-nums">{c.units}</td>
                  <td className="tabular-nums">{c.questions}</td>
                </tr>
              ))}
            </Table>
            <h3 className="mt-3 text-sm font-bold">前 3 題題面</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {preview.samples.map((s, i) => <li key={i}>{s}</li>)}
              {preview.samples.length === 0 && <li>（沒有題目）</li>}
            </ol>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={confirmUpload} disabled={busy}>{busy ? '上傳中…' : '確認上傳'}</Button>
            <Button type="button" variant="ghost" onClick={clear}>取消</Button>
          </div>
        </div>
      )}

      {res && <Alert kind={res.ok ? 'ok' : 'error'}>{res.t}</Alert>}
      <p className="text-xs text-ink-soft">選擇檔案後會先驗證並顯示預覽與警告，按「確認上傳」才會真正寫入資料庫。</p>
    </div>
  );
}

export function PackActions({ name, enabled }: { name: string; enabled: boolean }) {
  const router = useRouter();
  const b = 'rounded border border-line bg-white px-2 py-1 text-xs font-semibold hover:border-ballpoint';
  return (
    <div className="flex flex-wrap gap-1">
      <button className={b} onClick={async () => { await send(`/api/admin/content/${name}`, { enabled: !enabled }, 'PATCH'); router.refresh(); }}>{enabled ? '停用' : '啟用'}</button>
      <a className={b} href={`/api/admin/content/${name}`}>下載</a>
      <button className={`${b} text-pen`} onClick={async () => { if (confirm(`刪除內容包「${name}」？學生已有的作答記錄會保留。`)) { await send(`/api/admin/content/${name}`, undefined, 'DELETE'); router.refresh(); } }}>刪除</button>
    </div>
  );
}
