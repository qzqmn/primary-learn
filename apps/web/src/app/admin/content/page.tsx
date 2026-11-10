import Link from 'next/link';
import { pageUser } from '@/lib/pageAuth';
import { getDb } from '@/lib/db';
import { contentPacks } from '@/lib/db/schema';
import { loadCatalog, packSchema } from '@/lib/content/registry';
import { SUBJECT_LABEL, type Subject } from '@/lib/content/types';
import { Card, Empty, Table, hk } from '@/components/kit';
import { Alert } from '@/components/ui';
import { PackTools, PackActions } from './PackTools';

export const dynamic = 'force-dynamic';
export const metadata = { title: '題庫與內容包' };

export default async function ContentPage() {
  await pageUser(['admin']);
  const cat = loadCatalog();
  const uploaded = getDb().select().from(contentPacks).all();
  const uploadedNames = new Set(uploaded.map((u) => u.name));
  const bySource = new Map<string, { units: number; questions: number; license: string }>();
  for (const u of cat.units) {
    if (uploadedNames.has(u.source)) continue;
    const e = bySource.get(u.source) ?? { units: 0, questions: 0, license: u.license ?? '' };
    e.units++;
    e.questions += u.bank?.length ?? 0;
    bySource.set(u.source, e);
  }
  const grid = (['math', 'english', 'chinese', 'general'] as Subject[]).map((s) => ({ s, per: [1, 2, 3, 4, 5, 6].map((g) => cat.units.filter((u) => u.subject === s && u.grade === g).length) }));

  // A4：主動比對「目錄包與上傳包」重複的 unit id
  const dirUnitIds = new Set(cat.units.filter((u) => u.source !== 'builtin' && !uploadedNames.has(u.source)).map((u) => u.id));
  const conflictPacks: { name: string; enabled: boolean }[] = [];
  const duplicateIds = new Set<string>();
  for (const p of uploaded) {
    let raw: unknown;
    try {
      raw = JSON.parse(p.json);
    } catch {
      continue;
    }
    const parsed = packSchema.safeParse(raw);
    if (!parsed.success) continue;
    const dup = parsed.data.units.map((u) => u.id).filter((id) => dirUnitIds.has(id));
    if (dup.length) {
      conflictPacks.push({ name: p.name, enabled: p.enabled });
      dup.forEach((id) => duplicateIds.add(id));
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold">題庫與內容包</h1>

      {cat.errors.length > 0 && (
        <Alert kind="error">
          <p className="font-bold">載入內容包時發生錯誤，以下內容包已被略過：</p>
          <ul className="mt-1 list-disc pl-5">{cat.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </Alert>
      )}

      {duplicateIds.size > 0 && (
        <Alert kind="error">
          <p className="font-bold">目錄包與上傳包使用重複的單元 ID</p>
          <p className="mt-1">以下單元 ID 同時存在於隨系統附帶的內容包與已上傳的內容包，可能令題目被覆蓋或整個內容包被略過：</p>
          <ul className="mt-1 list-disc pl-5 font-mono text-xs">{[...duplicateIds].map((id) => <li key={id}>{id}</li>)}</ul>
          <p className="mt-2">你可以停用其中一個已上傳的內容包：</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {conflictPacks.map((p) => (
              <div key={p.name} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-1 text-xs">
                <span className="font-mono">{p.name}</span>
                <PackActions name={p.name} enabled={p.enabled} />
              </div>
            ))}
          </div>
        </Alert>
      )}

      <Card title={`目前共 ${cat.units.length} 個練習單元`}>
        <Table head={['科目', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']}>
          {grid.map((r) => (
            <tr key={r.s}>
              <td className="font-semibold">{SUBJECT_LABEL[r.s]}</td>
              {r.per.map((n, i) => <td key={i} className="tabular-nums">{n || '—'}</td>)}
            </tr>
          ))}
        </Table>
        <p className="mt-2 text-xs text-ink-soft">「數學」和大部分英文、中文單元由程式按參數即時生成，題量沒有上限；內容包是人工編寫的固定題目。</p>
      </Card>

      <Card title="上傳內容包">
        <PackTools />
      </Card>

      <Card title="已上傳的內容包">
        {uploaded.length === 0 ? (
          <Empty>還沒有上傳的內容包。上傳後會存在資料庫，並跟著備份一起匯出與還原。</Empty>
        ) : (
          <Table head={['名稱', '單元', '題數', '授權', '授權連結／取用日期', '來源', '上傳', '覆核', '狀態', '操作']}>
            {uploaded.map((p) => (
              <tr key={p.name} className="align-top">
                <td className="font-mono text-xs"><Link href={`/admin/content/${encodeURIComponent(p.name)}`} className="text-ballpoint underline underline-offset-2">{p.name}</Link></td>
                <td className="tabular-nums">{p.units}</td>
                <td className="tabular-nums">{p.questions}</td>
                <td>{p.license}</td>
                <td className="space-y-0.5 text-xs">
                  {p.licenseUrl && <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer" className="block text-ballpoint underline underline-offset-2">授權條款</a>}
                  {p.sourceUrl && <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="block text-ballpoint underline underline-offset-2">原始來源</a>}
                  {p.retrievedAt && <span className="block text-ink-soft">取用：{p.retrievedAt}</span>}
                  {!p.licenseUrl && !p.sourceUrl && !p.retrievedAt && '—'}
                </td>
                <td className="max-w-48 truncate text-xs">{p.source ?? '—'}</td>
                <td className="whitespace-nowrap">{hk(p.createdAt, false)}</td>
                <td className="whitespace-nowrap text-xs">{p.reviewedAt ? <span className="font-semibold text-ok">已覆核<br />{hk(p.reviewedAt, false)}</span> : '未覆核'}</td>
                <td>{p.enabled ? '使用中' : '已停用'}</td>
                <td><PackActions name={p.name} enabled={p.enabled} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="隨系統附帶的內容">
        <Table head={['來源', '單元', '固定題數', '授權']}>
          {[...bySource].map(([src, v]) => (
            <tr key={src}>
              <td className="font-mono text-xs">{src === 'builtin' ? '內建（程式生成）' : <Link href={`/admin/content/${encodeURIComponent(src)}`} className="text-ballpoint underline underline-offset-2">{src}</Link>}</td>
              <td className="tabular-nums">{v.units}</td>
              <td className="tabular-nums">{v.questions || '—'}</td>
              <td>{v.license}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
