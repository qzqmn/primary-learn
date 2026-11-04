import { eq } from 'drizzle-orm';
import { api, HttpError, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { assertRate } from '@/lib/ratelimit';
import { getDb } from '@/lib/db';
import { contentPacks } from '@/lib/db/schema';
import { allUnits, licenseAllowed, packSchema, reloadCatalog } from '@/lib/content/registry';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const MAX_BYTES = 5 * 1024 * 1024;

/** 上傳內容包（JSON）。會驗證格式、授權白名單和單元 ID 衝突；通過後存進資料庫並立即生效。 */
export const POST = api(async (req) => {
  const admin = await requireUser(['admin']);
  assertRate(`content-upload:${admin.id}`, 30, 3600, '上傳太頻繁，請稍後再試');
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
  if (!licenseAllowed(p.license)) throw new HttpError(400, `授權「${p.license}」不被接受。只收 CC0、CC BY、CC BY-SA、MIT、Apache-2.0、BSD、ISC、Unlicense 或原創內容；不收 NC（非商業）、ND（禁止改作）或沒有授權的內容。`);
  if (getDb().select({ n: contentPacks.name }).from(contentPacks).where(eq(contentPacks.name, p.pack)).get()) throw new HttpError(409, `已有同名內容包「${p.pack}」，請先刪除舊的`);
  const existing = new Set(allUnits().map((u) => u.id));
  const clash = p.units.find((u) => existing.has(u.id));
  if (clash) throw new HttpError(409, `單元 ID「${clash.id}」已被使用，請改名`);
  const ids = p.units.map((u) => u.id);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, '同一個內容包內有重複的單元 ID');

  const questions = p.units.reduce((n, u) => n + u.questions.length, 0);
  getDb().insert(contentPacks).values({ name: p.pack, json: text, license: p.license, source: p.source ?? p.attribution ?? null, units: p.units.length, questions, uploadedBy: admin.id, createdAt: Date.now() }).run();
  reloadCatalog();
  audit({ actorId: admin.id, action: 'content.upload', target: p.pack, meta: { units: p.units.length, questions, license: p.license } });
  return ok({ name: p.pack, units: p.units.length, questions });
});
