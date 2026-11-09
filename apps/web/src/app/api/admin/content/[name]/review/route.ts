import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { contentPacks } from '@/lib/db/schema';
import { loadCatalog, packSchema } from '@/lib/content/registry';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

type Sample = { unitId: string; index: number; prompt: string; choices?: string[]; answer: string; explain?: string; tag: string };

/** 收集該內容包（資料庫上傳包或目錄包）的全部題目，供抽檢試做 */
function collect(name: string): Sample[] {
  const row = getDb().select().from(contentPacks).where(eq(contentPacks.name, name)).get();
  const out: Sample[] = [];
  if (row) {
    let raw: unknown;
    try {
      raw = JSON.parse(row.json);
    } catch {
      return out;
    }
    const parsed = packSchema.safeParse(raw);
    if (!parsed.success) return out;
    for (const u of parsed.data.units) {
      u.questions.forEach((q, i) =>
        out.push({
          unitId: u.id,
          index: i,
          prompt: q.prompt,
          choices: 'choices' in q ? q.choices : undefined,
          answer: q.answer,
          explain: q.explain,
          tag: q.tag,
        }),
      );
    }
  } else {
    for (const u of loadCatalog().units.filter((x) => x.source === name)) {
      (u.bank ?? []).forEach((q, i) =>
        out.push({ unitId: u.id, index: i, prompt: q.prompt, choices: q.choices, answer: q.answer, explain: q.explain, tag: q.tag }),
      );
    }
  }
  return out;
}

/** 平均散佈抽 5 題；不足 5 題就全部回傳 */
function pick(all: Sample[]): Sample[] {
  if (all.length <= 5) return all;
  const idx = new Set<number>();
  for (let i = 0; i < 5; i++) idx.add(Math.floor((i * all.length) / 5));
  return [...idx].sort((a, b) => a - b).map((i) => all[i]);
}

const bodySchema = z.object({ mark: z.boolean().optional() });

/** 抽 5 題回傳題面供試做；{ mark: true } 寫入覆核紀錄並 audit */
export const POST = api(async (req, ctx) => {
  const admin = await requireUser(['admin']);
  const { name } = await ctx.params;
  const { mark } = await readJson(req, bodySchema);
  const all = collect(name);
  const sample = pick(all);

  if (mark) {
    const row = getDb().select().from(contentPacks).where(eq(contentPacks.name, name)).get();
    if (!row) throw new HttpError(400, '目錄包沒有資料庫記錄，無法標記覆核；請直接維護 content/ 內的檔案');
    const now = Date.now();
    getDb()
      .update(contentPacks)
      .set({
        reviewedAt: now,
        reviewedBy: admin.id,
        reviewSample: JSON.stringify(sample.map((s) => ({ unitId: s.unitId, index: s.index, prompt: s.prompt }))),
      })
      .where(eq(contentPacks.name, name))
      .run();
    audit({ actorId: admin.id, action: 'content.review', target: name, meta: { sampled: sample.length, total: all.length } });
    return ok({ reviewedAt: now, reviewedBy: admin.id });
  }
  return ok({ questions: sample });
});
