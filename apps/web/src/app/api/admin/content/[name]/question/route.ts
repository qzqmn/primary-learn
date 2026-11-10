import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { contentPacks } from '@/lib/db/schema';
import { packSchema, reloadCatalog } from '@/lib/content/registry';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  unitId: z.string().min(1).max(60),
  index: z.number().int().min(0),
  patch: z
    .object({
      prompt: z.string().min(1).max(600).optional(),
      answer: z.string().min(1).max(120).optional(),
      explain: z.string().max(600).optional(),
      tag: z.string().min(1).max(60).optional(),
      choices: z.array(z.string().min(1).max(120)).min(2).max(6).optional(),
      source: z.string().max(300).optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '沒有要修改的欄位' }),
});

/** 逐題編輯（只支援資料庫上傳包）。改完重新用 packSchema 校驗整包、寫回並重載題庫。 */
export const PATCH = api(async (req, ctx) => {
  const admin = await requireUser(['admin']);
  const { name } = await ctx.params;
  const { unitId, index, patch } = await readJson(req, patchSchema);
  const row = getDb().select().from(contentPacks).where(eq(contentPacks.name, name)).get();
  if (!row) throw new HttpError(400, '此內容包是隨系統附帶的目錄包，請直接修改 content/ 目錄內的 JSON 檔案並重新部署；後台逐題編輯只支援上傳到資料庫的內容包');

  let raw: unknown = null;
  try {
    raw = JSON.parse(row.json);
  } catch {
    throw new HttpError(500, '內容包資料損毀，無法編輯');
  }
  if (!packSchema.safeParse(raw).success) throw new HttpError(500, '內容包格式有誤，無法編輯');

  const data = raw as { units: Array<{ id: string; questions: Array<Record<string, unknown> & { type: string }> }> };
  const unit = data.units.find((u) => u.id === unitId);
  if (!unit) throw new HttpError(404, '找不到此單元');
  if (index < 0 || index >= unit.questions.length) throw new HttpError(404, '找不到此題');
  const q = unit.questions[index];
  if (patch.prompt !== undefined) q.prompt = patch.prompt;
  if (patch.answer !== undefined) q.answer = patch.answer;
  if (patch.explain !== undefined) q.explain = patch.explain;
  if (patch.tag !== undefined) q.tag = patch.tag;
  if (patch.source !== undefined) q.source = patch.source;
  if (patch.choices !== undefined) {
    if (q.type !== 'choice') throw new HttpError(400, '只有選擇題可以修改選項');
    q.choices = patch.choices;
  }

  const check = packSchema.safeParse(raw);
  if (!check.success) {
    const i = check.error.issues[0];
    throw new HttpError(400, `修改後格式有誤：${i.path.join('.') || '(根)'} — ${i.message}`);
  }
  getDb().update(contentPacks).set({ json: JSON.stringify(raw) }).where(eq(contentPacks.name, name)).run();
  reloadCatalog();
  audit({ actorId: admin.id, action: 'content.question.edit', target: name, meta: { unitId, index } });
  return ok();
});
