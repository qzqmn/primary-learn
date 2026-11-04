import { pageUser } from '@/lib/pageAuth';
import { getDb } from '@/lib/db';
import { contentPacks } from '@/lib/db/schema';
import { loadCatalog } from '@/lib/content/registry';
import { SUBJECT_LABEL, type Subject } from '@/lib/content/types';
import { Card, Empty, Table, hk } from '@/components/kit';
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

  return (
    <>
      <h1 className="text-2xl font-bold">題庫與內容包</h1>
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
          <Table head={['名稱', '單元', '題數', '授權', '來源', '上傳', '狀態', '操作']}>
            {uploaded.map((p) => (
              <tr key={p.name} className="align-top">
                <td className="font-mono text-xs">{p.name}</td>
                <td className="tabular-nums">{p.units}</td>
                <td className="tabular-nums">{p.questions}</td>
                <td>{p.license}</td>
                <td className="max-w-48 truncate text-xs">{p.source ?? '—'}</td>
                <td className="whitespace-nowrap">{hk(p.createdAt, false)}</td>
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
              <td className="font-mono text-xs">{src === 'builtin' ? '內建（程式生成）' : src}</td>
              <td className="tabular-nums">{v.units}</td>
              <td className="tabular-nums">{v.questions || '—'}</td>
              <td>{v.license}</td>
            </tr>
          ))}
        </Table>
        {cat.errors.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-pen">{cat.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      </Card>
    </>
  );
}
