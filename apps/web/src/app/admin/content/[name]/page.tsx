import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { pageUser } from '@/lib/pageAuth';
import { getDb } from '@/lib/db';
import { contentPacks } from '@/lib/db/schema';
import { loadCatalog, packSchema } from '@/lib/content/registry';
import { SUBJECT_LABEL, type Subject } from '@/lib/content/types';
import { Card, Table } from '@/components/kit';
import { Alert } from '@/components/ui';
import { EditQuestion, ReviewTools } from './DetailTools';

export const dynamic = 'force-dynamic';
export const metadata = { title: '內容包詳情' };

type VQ = { type: string; prompt: string; choices?: string[]; answer: string; explain?: string; tag: string; source?: string };
type VU = { id: string; subject: Subject; grade: number; title: string; questions: VQ[] };

/** A2：內容包詳情頁。答案只在此管理後台頁顯示。 */
export default async function ContentDetailPage({ params }: { params: Promise<{ name: string }> }) {
  await pageUser(['admin']);
  const { name } = await params;
  const row = getDb().select().from(contentPacks).where(eq(contentPacks.name, name)).get();

  let from: 'db' | 'catalog' = 'catalog';
  let version: number | undefined;
  let license = '';
  let licenseUrl: string | undefined;
  let retrievedAt: string | undefined;
  let adaptationNote: string | undefined;
  let sourceUrl: string | undefined;
  let sourceText: string | undefined;
  let units: VU[] = [];

  if (row) {
    // 上傳包：從 contentPacks.json 讀取完整題目
    from = 'db';
    license = row.license;
    licenseUrl = row.licenseUrl ?? undefined;
    retrievedAt = row.retrievedAt ?? undefined;
    adaptationNote = row.adaptationNote ?? undefined;
    sourceUrl = row.sourceUrl ?? undefined;
    sourceText = row.source ?? undefined;
    let raw: unknown = null;
    try {
      raw = JSON.parse(row.json);
    } catch {
      /* 資料損毀時仍顯示治理欄位 */
    }
    const parsed = packSchema.safeParse(raw);
    if (parsed.success) {
      const p = parsed.data;
      version = p.version;
      licenseUrl = licenseUrl ?? p.licenseUrl;
      retrievedAt = retrievedAt ?? p.retrievedAt;
      adaptationNote = adaptationNote ?? p.adaptationNote;
      sourceUrl = sourceUrl ?? p.sourceUrl;
      sourceText = sourceText ?? p.source ?? p.attribution;
      units = p.units.map((u) => ({
        id: u.id,
        subject: u.subject,
        grade: u.grade,
        title: u.title,
        questions: u.questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          choices: 'choices' in q ? q.choices : undefined,
          answer: q.answer,
          explain: q.explain,
          tag: q.tag,
          source: q.source,
        })),
      }));
    }
  } else {
    // 目錄包：從 loadCatalog().units 依 source === name 過濾，bank 有完整題目
    const catUnits = loadCatalog().units.filter((u) => u.source === name);
    if (catUnits.length === 0) notFound();
    const first = catUnits[0];
    license = first.license ?? '';
    licenseUrl = first.licenseUrl;
    retrievedAt = first.retrievedAt;
    adaptationNote = first.adaptationNote;
    sourceUrl = first.sourceUrl;
    units = catUnits.map((u) => ({
      id: u.id,
      subject: u.subject,
      grade: u.grade,
      title: u.title,
      questions: (u.bank ?? []).map((q) => ({
        type: q.type,
        prompt: q.prompt,
        choices: q.choices,
        answer: q.answer,
        explain: q.explain,
        tag: q.tag,
        source: q.source,
      })),
    }));
  }

  const totalQuestions = units.reduce((n, u) => n + u.questions.length, 0);

  return (
    <>
      <Link href="/admin/content" className="text-sm font-semibold text-ballpoint underline underline-offset-2">← 返回題庫與內容包</Link>
      <h1 className="text-2xl font-bold">內容包詳情：{name}</h1>

      {from === 'catalog' && (
        <Alert kind="info">
          此為<b>隨系統附帶的目錄包</b>（來自 <code>content/</code> 目錄）：可以逐題查看和抽檢試做，但<b>不能在網上編輯題目</b>——修改請改倉庫 <code>content/</code> 內的 JSON 後重新部署。網上逐題「編輯」只適用於<b>資料庫上傳</b>的內容包。
        </Alert>
      )}

      <Card title="授權治理資訊">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="font-semibold">類型</dt><dd>{from === 'db' ? '資料庫上傳' : '隨系統附帶（目錄包）'}</dd>
          <dt className="font-semibold">授權</dt><dd>{license || '—'}</dd>
          <dt className="font-semibold">授權條款</dt><dd>{licenseUrl ? <a href={licenseUrl} target="_blank" rel="noopener noreferrer" className="text-ballpoint underline underline-offset-2">{licenseUrl}</a> : '—'}</dd>
          <dt className="font-semibold">原始來源</dt><dd>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-ballpoint underline underline-offset-2">{sourceUrl}</a> : '—'}</dd>
          <dt className="font-semibold">取用日期</dt><dd>{retrievedAt || '—'}</dd>
          <dt className="font-semibold">改編說明</dt><dd>{adaptationNote || '—'}</dd>
          <dt className="font-semibold">來源說明</dt><dd className="break-words">{sourceText || '—'}</dd>
          <dt className="font-semibold">版本</dt><dd>{version ?? '—'}</dd>
          <dt className="font-semibold">單元／題數</dt><dd>{units.length} 個單元、{totalQuestions} 題</dd>
        </dl>
      </Card>

      <Card title="人工抽檢覆核">
        <ReviewTools name={name} canMark={from === 'db'} reviewedAt={row?.reviewedAt ?? null} reviewedBy={row?.reviewedBy ?? null} />
      </Card>

      <Card title="單元與逐題清單（答案僅於此管理後台顯示）">
        {units.length === 0 ? (
          <p className="text-sm text-ink-soft">無法讀取題目，內容包資料可能損毀。</p>
        ) : (
          <div className="space-y-6">
            {units.map((u) => (
              <section key={u.id}>
                <h3 className="mb-2 font-bold">{u.title}　<span className="text-sm font-normal text-ink-soft">{SUBJECT_LABEL[u.subject]} P{u.grade}　<code className="font-mono text-xs">{u.id}</code></span></h3>
                <Table head={['#', '題型', '題面', '選項', '答案', '解釋', '知識點', '來源', '操作']}>
                  {u.questions.map((q, i) => (
                    <tr key={i} className="align-top">
                      <td className="tabular-nums">{i + 1}</td>
                      <td>{q.type}</td>
                      <td className="max-w-md">{q.prompt}</td>
                      <td className="max-w-48 text-xs">{q.choices?.join('　／　') ?? '—'}</td>
                      <td className="font-bold">{q.answer}</td>
                      <td className="max-w-48 text-xs">{q.explain ?? '—'}</td>
                      <td className="text-xs">{q.tag}</td>
                      <td className="max-w-40 text-xs">{q.source ?? '—'}</td>
                      <td>
                        {from === 'db' ? (
                          <EditQuestion name={name} unitId={u.id} index={i} q={{ prompt: q.prompt, answer: q.answer, explain: q.explain, tag: q.tag, choices: q.choices, source: q.source }} />
                        ) : (
                          <span className="text-xs text-ink-soft">目錄包不可網上編輯</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </Table>
              </section>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
