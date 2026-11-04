import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { MATH_UNITS } from './math';
import { MORE_MATH_UNITS } from './math-more';
import { ENGLISH_UNITS } from './english';
import { CHINESE_UNITS } from './chinese';
import { MORE_CHINESE_UNITS } from './chinese-more';
import { LESSONS } from './lessons';
import type { GenQuestion, Subject, Unit } from './types';
import { getDb } from '../db';
import { contentPacks } from '../db/schema';

const choiceQ = z.object({
  type: z.literal('choice'),
  prompt: z.string().min(1).max(600),
  choices: z.array(z.string().min(1).max(120)).min(2).max(6),
  answer: z.string().min(1).max(120),
  explain: z.string().max(600).optional(),
  tag: z.string().min(1).max(60),
});
const textQ = z.object({
  type: z.literal('text'),
  prompt: z.string().min(1).max(600),
  answer: z.string().min(1).max(120),
  accept: z.array(z.string().max(120)).max(10).optional(),
  explain: z.string().max(600).optional(),
  tag: z.string().min(1).max(60),
});
const numberQ = z.object({
  type: z.literal('number'),
  prompt: z.string().min(1).max(600),
  answer: z.string().min(1).max(40),
  suffix: z.string().max(20).optional(),
  explain: z.string().max(600).optional(),
  tag: z.string().min(1).max(60),
});
const question = z
  .discriminatedUnion('type', [choiceQ, textQ, numberQ])
  .refine((q) => q.type !== 'choice' || q.choices.includes(q.answer), { message: 'choice answer must be one of choices' })
  .refine((q) => q.type !== 'choice' || new Set(q.choices).size === q.choices.length, { message: 'choices must be unique' });

export const packSchema = z.object({
  pack: z.string().regex(/^[a-z0-9][a-z0-9-]{1,40}$/, 'pack name: lowercase letters, digits, "-"'),
  version: z.number().int(),
  license: z.string().min(1, 'license is required').max(60),
  source: z.string().max(300).optional(),
  attribution: z.string().max(300).optional(),
  units: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(60),
        subject: z.enum(['math', 'english', 'chinese', 'general']),
        grade: z.number().int().min(1).max(6),
        title: z.string().min(1).max(60),
        intro: z.array(z.string().max(500)).default([]),
        lesson: z.object({ points: z.array(z.string().max(500)).max(10), pitfalls: z.array(z.string().max(500)).max(6).optional() }).optional(),
        questions: z.array(question).min(1).max(5000),
      }),
    )
    .min(1)
    .max(100),
});
export type Pack = z.infer<typeof packSchema>;

/**
 * 上傳內容包允許的授權（與本專案 AGPL／CC BY-SA 可以並存的寬鬆授權）。
 * 禁止 NC（非商業）與 ND（禁止改作），也不收「無授權」的內容。
 * 這只是防呆，不能代替你自己確認來源真的使用該授權。
 */
const ALLOWED = new Set(['cc0', 'cc0-1.0', 'ccby4.0', 'ccby', 'ccbysa4.0', 'ccbysa', 'mit', 'apache2.0', 'apache-2.0', 'bsd2clause', 'bsd3clause', 'isc', 'unlicense', 'original', '原創']);
const norm = (l: string) => l.toLowerCase().replace(/[\s_]/g, '').replace(/-/g, '');
export function licenseAllowed(license: string): boolean {
  const n = norm(license);
  if (/nc|nd/.test(n.replace(/apache|unlicense|bsd|isc/g, ''))) return false;
  if (ALLOWED.has(n)) return true;
  // 例如 "CC BY-SA 4.0（原創）"
  return [...ALLOWED].some((a) => a.length >= 3 && n.startsWith(a));
}

export function packToUnits(raw: unknown): Unit[] {
  const p = packSchema.parse(raw);
  return p.units.map((u) => {
    const bank = u.questions as GenQuestion[];
    return { id: u.id, subject: u.subject, grade: u.grade, title: u.title, intro: u.intro, lesson: u.lesson, tags: [...new Set(bank.map((q) => q.tag))], bank, source: p.pack, license: p.license };
  });
}

type Catalog = { units: Unit[]; errors: string[] };
// 放在 globalThis：Next.js 會把頁面與 API 路由打成不同的模組包，模組層級的變數不會共用，
// 在 API 重新載入題庫後，頁面那邊仍會看到舊的快取。
const g = globalThis as unknown as { __hkplCatalog?: Catalog };

/** 內建單元 ＋ CONTENT_DIR 內的 JSON 內容包 ＋ 後台上傳（存在資料庫）的內容包。壞掉的包只跳過並記錄原因。 */
export function loadCatalog(force = false): { units: Unit[]; errors: string[] } {
  if (g.__hkplCatalog && !force) return g.__hkplCatalog;
  const builtin = [...MATH_UNITS, ...MORE_MATH_UNITS, ...ENGLISH_UNITS, ...CHINESE_UNITS, ...MORE_CHINESE_UNITS].map((u) => ({ ...u, license: u.license ?? 'AGPL-3.0-only', lesson: u.lesson ?? LESSONS[u.id] }));
  const units: Unit[] = builtin;
  const errors: string[] = [];
  const seen = new Set(units.map((u) => u.id));
  const add = (label: string, raw: unknown) => {
    try {
      const list = packToUnits(raw).map((u) => ({ ...u, lesson: u.lesson ?? LESSONS[u.id] }));
      const dup = list.find((u) => seen.has(u.id));
      if (dup) throw new Error(`duplicate unit id: ${dup.id}`);
      for (const u of list) seen.add(u.id);
      units.push(...list);
    } catch (e) {
      errors.push(`${label}: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
    }
  };

  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.CONTENT_DIR || './content');
  let files: string[] = [];
  try {
    files = fs.readdirSync(/*turbopackIgnore: true*/ dir).filter((f) => f.endsWith('.json'));
  } catch {
    /* 沒有內容目錄也能運作 */
  }
  for (const f of files.sort()) {
    try {
      add(f, JSON.parse(fs.readFileSync(path.join(/*turbopackIgnore: true*/ dir, f), 'utf8')));
    } catch (e) {
      errors.push(`${f}: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
    }
  }
  try {
    for (const row of getDb().select().from(contentPacks).all()) {
      if (!row.enabled) continue;
      try {
        add(`上傳：${row.name}`, JSON.parse(row.json));
      } catch (e) {
        errors.push(`上傳：${row.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch {
    /* 資料庫尚未就緒（例如建置階段） */
  }
  if (errors.length) console.error('[content] skipped packs:', errors);
  g.__hkplCatalog = { units, errors };
  return g.__hkplCatalog;
}

export const reloadCatalog = () => loadCatalog(true);
export const allUnits = () => loadCatalog().units;
export const findUnit = (id: string) => allUnits().find((u) => u.id === id);
export const unitsFor = (subject?: Subject, grade?: number) => allUnits().filter((u) => (!subject || u.subject === subject) && (!grade || u.grade === grade));
