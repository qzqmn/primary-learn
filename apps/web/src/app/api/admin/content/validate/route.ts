import { eq } from 'drizzle-orm';
import { api, HttpError, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { contentPacks } from '@/lib/db/schema';
import { allUnits, licenseAllowed, packSchema } from '@/lib/content/registry';

export const dynamic = 'force-dynamic';
const MAX_BYTES = 5 * 1024 * 1024;

/** 上傳前預覽：驗證格式、授權與單元 ID 衝突，只回傳預覽資訊，不寫入資料庫。 */
export const POST = api(async (req) => {
  await requireUser(['admin']);
  const text = await req.text();
  if (text.length > MAX_BYTES) throw new HttpError(413, '內容包太大（上限 5 MB）');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpError(400, '不是有效的 JSON 檔');
  }
  const parsed = packSchema.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw new HttpError(400, `格式有誤：${i.path.join('.') || '(根)'} — ${i.message}`);
  }
  const p = parsed.data;
  const existing = new Set(allUnits().map((u) => u.id));
  const conflicts = p.units.filter((u) => existing.has(u.id)).map((u) => u.id);
  const ids = p.units.map((u) => u.id);
  const dupInPack = new Set(ids).size !== ids.length;
  const nameTaken = !!getDb().select({ n: contentPacks.name }).from(contentPacks).where(eq(contentPacks.name, p.pack)).get();

  const cellMap = new Map<string, { subject: string; grade: number; units: number; questions: number }>();
  for (const u of p.units) {
    const k = `${u.subject}-${u.grade}`;
    const c = cellMap.get(k) ?? { subject: u.subject, grade: u.grade, units: 0, questions: 0 };
    c.units += 1;
    c.questions += u.questions.length;
    cellMap.set(k, c);
  }
  const cells = [...cellMap.values()].sort((a, b) => a.subject.localeCompare(b.subject) || a.grade - b.grade);
  const totalQuestions = p.units.reduce((n, u) => n + u.questions.length, 0);
  const samples = p.units.flatMap((u) => u.questions.map((q) => q.prompt)).slice(0, 3);

  return ok({
    name: p.pack,
    version: p.version,
    license: p.license,
    licenseUrl: p.licenseUrl ?? null,
    retrievedAt: p.retrievedAt ?? null,
    adaptationNote: p.adaptationNote ?? null,
    sourceUrl: p.sourceUrl ?? null,
    licenseOk: licenseAllowed(p.license),
    nameTaken,
    conflicts,
    dupInPack,
    totalUnits: p.units.length,
    totalQuestions,
    cells,
    samples,
  });
});
