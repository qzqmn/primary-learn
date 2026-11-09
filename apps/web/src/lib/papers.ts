import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from './db';
import { assignments, attempts, classes, papers, users } from './db/schema';
import { HttpError } from './http';
import type { SessionUser } from './session';
import { licenseAllowed } from './content/registry';
import { toClient } from './content/engine';
import type { ServerQuestion } from './content/types';

/* ------------------------------------------------------------------ */
/* 題目：沿用 content/registry.ts 的 choice / text / number 三型        */
/* ------------------------------------------------------------------ */
const choiceQ = z.object({
  type: z.literal('choice'),
  prompt: z.string().min(1).max(600),
  choices: z.array(z.string().min(1).max(120)).min(2).max(6),
  answer: z.string().min(1).max(120),
  explain: z.string().max(600).optional(),
  tag: z.string().min(1).max(60),
  source: z.string().max(300).optional(),
});
const textQ = z.object({
  type: z.literal('text'),
  prompt: z.string().min(1).max(600),
  answer: z.string().min(1).max(120),
  accept: z.array(z.string().max(120)).max(10).optional(),
  explain: z.string().max(600).optional(),
  tag: z.string().min(1).max(60),
  source: z.string().max(300).optional(),
});
const numberQ = z.object({
  type: z.literal('number'),
  prompt: z.string().min(1).max(600),
  answer: z.string().min(1).max(40),
  suffix: z.string().max(20).optional(),
  explain: z.string().max(600).optional(),
  tag: z.string().min(1).max(60),
  source: z.string().max(300).optional(),
});
export const question = z
  .discriminatedUnion('type', [choiceQ, textQ, numberQ])
  .refine((q) => q.type !== 'choice' || q.choices.includes(q.answer), { message: 'choice answer must be one of choices' })
  .refine((q) => q.type !== 'choice' || new Set(q.choices).size === q.choices.length, { message: 'choices must be unique' });
export type PaperQuestion = z.infer<typeof question>;

/** 表單的空字串／null 視為「沒有填」，讓 optional 欄位與 .url() 能正常通過 */
const emptyToUndef = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? undefined : t;
  }
  return v;
};
const cleanNum = (v: unknown) => (v === '' || v === null ? undefined : v);
const urlField = z.preprocess(emptyToUndef, z.string().url().max(300).optional());
const strField = (max: number) => z.preprocess(emptyToUndef, z.string().max(max).optional());

const paperObject = z.object({
  title: z.string().trim().min(1).max(120),
  subject: z.enum(['math', 'english', 'chinese', 'general']),
  grade: z.coerce.number().int().min(1).max(6),
  kind: z.enum(['original', 'licensed', 'index', 'private']),
  visibility: z.enum(['private', 'class', 'public']).default('private'),
  license: strField(120),
  licenseUrl: urlField,
  sourceUrl: urlField,
  retrievedAt: strField(20),
  adaptationNote: strField(500),
  /** 原創聲明（不入庫，僅供合規閘使用；通過後會寫入 adaptationNote） */
  ownerDeclaration: z.boolean().optional(),
  questions: z.array(question).max(200).default([]),
  unitIds: z.array(z.string().max(60)).max(50).default([]),
  timeLimitMin: z.preprocess(cleanNum, z.coerce.number().int().min(1).max(300).nullable().optional()),
  pointsPerQuestion: z.preprocess(cleanNum, z.coerce.number().int().min(1).max(100).default(10)),
});

/** 建立／整份更新的輸入 schema。index 卷 questions 必須是空陣列。 */
export const paperSchema = paperObject.refine(
  (v) => v.kind !== 'index' || v.questions.length === 0,
  { message: '索引卷只存外連、不存題目，questions 必須是空陣列' },
);
export type PaperCreate = z.infer<typeof paperSchema>;
export type PaperKind = PaperCreate['kind'];
export type PaperRow = typeof papers.$inferSelect;

export const OWNER_DECLARATION = '本人聲明：本試卷為自行出題的原創內容，並未收錄任何第三方試卷題目。';

/* ------------------------------------------------------------------ */
/* 法律與合規底線                                                      */
/* ------------------------------------------------------------------ */
/** NC（非商業）／ND（禁止改作）／無授權 */
const RESTRICTED_LICENSE = /\bnc\b|\bnd\b|non-?commercial|no-?deriv(?:ative)?s?|noderiv|禁止改作|非商業|無授權|未授權|沒有授權|未經授權/i;
/** 課本／TSA／商業／補習社試卷等第三方來源（只對「會儲存題目」的卷檢查） */
const FORBIDDEN_SOURCE = /課本|教科書|textbook|\btsa\b|全港性系統評估|系統評估|商業試卷|補習社|補習班|版權所有|all rights reserved/i;

export type ComplianceInput = {
  kind: PaperKind;
  title?: string | null;
  license?: string | null;
  licenseUrl?: string | null;
  sourceUrl?: string | null;
  retrievedAt?: string | null;
  adaptationNote?: string | null;
  ownerDeclaration?: boolean;
  questions: unknown[];
};

/**
 * 授權閘：後台 license 為自填、不核驗，所有寫入路徑都要再跑一次。
 * 只接受三類：教師自出原創卷、明確開放授權卷、只存外連索引不存題目的卷；
 * NC／ND／無授權／課本／TSA／商業與補習社試卷一律拒絕。
 * 任何不合規都擲出 HttpError(400)，由 api() 統一回傳給前端顯示原因。
 */
export function assertPaperCompliance(p: ComplianceInput) {
  const license = (p.license ?? '').trim();
  const licenseUrl = (p.licenseUrl ?? '').trim();
  const sourceUrl = (p.sourceUrl ?? '').trim();
  const retrievedAt = (p.retrievedAt ?? '').trim();
  const adaptationNote = (p.adaptationNote ?? '').trim();
  const questions = p.questions ?? [];

  // 1) NC／ND／無授權：授權欄與條文連結一律拒絕（index 通常為空，自然略過）
  if (RESTRICTED_LICENSE.test(`${license} ${licenseUrl}`)) {
    throw new HttpError(400, `授權涉及 NC（非商業）／ND（禁止改作）／無授權，本系統一律拒絕：${license || licenseUrl}`);
  }
  // 2) 會儲存題目的卷，來源描述不得為課本／TSA／商業／補習社試卷；
  //    index 卷只存外連、不存題目，為三種容許方案之一，不作來源字眼封鎖。
  if (p.kind !== 'index') {
    const sourceText = [p.title ?? '', license, licenseUrl, sourceUrl].join(' ');
    if (FORBIDDEN_SOURCE.test(sourceText)) {
      throw new HttpError(400, '偵測到課本／TSA／商業或補習社試卷來源；本系統只接受教師原創卷、明確開放授權卷、或只存外連索引不存題目的卷，一律拒絕此類第三方試卷。');
    }
  }

  if (p.kind === 'licensed') {
    if (!license) throw new HttpError(400, '開放授權卷必須填寫授權（license），例如 CC0、CC BY 4.0、CC BY-SA 4.0。');
    if (!licenseUrl) throw new HttpError(400, '開放授權卷必須填寫授權條文連結（licenseUrl）以供查證。');
    if (!retrievedAt) throw new HttpError(400, '開放授權卷必須填寫取用日期（retrievedAt）。');
    if (!licenseAllowed(license)) throw new HttpError(400, `授權「${license}」不被接受：只收 CC0、CC BY、CC BY-SA 等允許改作與再發布的開放授權，不收 NC／ND／無授權。`);
    if (!questions.length) throw new HttpError(400, '開放授權卷必須至少有一題。');
  } else if (p.kind === 'index') {
    if (!sourceUrl) throw new HttpError(400, '索引卷必須填寫原站連結（sourceUrl）。');
    if (questions.length > 0) throw new HttpError(400, '索引卷只存外連、不存題目，questions 必須是空陣列；請勿貼上任何試卷題目。');
  } else {
    // original / private
    if (!adaptationNote && !p.ownerDeclaration) throw new HttpError(400, '原創卷必須填寫原創聲明／改編說明（adaptationNote），或勾選「本人聲明為原創」，確認沒有收錄任何第三方試卷。');
    if (license && !licenseAllowed(license)) throw new HttpError(400, `原創卷不應附帶第三方授權「${license}」；如引用開放授權內容，請改用「開放授權卷」並補齊授權資料。`);
    if (!questions.length) throw new HttpError(400, '原創卷必須至少有一題。');
  }
}

/** 把驗證後的題目加上固定 unit（供 /api/learn/answer、/finish 沿用），序列化成 papers.questions */
export function serializeQuestions(questions: PaperQuestion[], paperId: string): string {
  const unit = `paper:${paperId}`;
  return JSON.stringify(questions.map((q) => ({ ...q, unit })));
}

/** POST／PATCH 共用的可寫入欄位（不含 id／ownerId／createdAt／審核欄），會再跑一次合規閘 */
export function paperContentValues(b: PaperCreate, id: string) {
  assertPaperCompliance(b);
  const effectiveNote = b.adaptationNote?.trim() || (b.ownerDeclaration ? OWNER_DECLARATION : null);
  return {
    title: b.title,
    subject: b.subject,
    grade: b.grade,
    kind: b.kind,
    visibility: b.visibility,
    license: b.license ?? null,
    licenseUrl: b.licenseUrl ?? null,
    sourceUrl: b.sourceUrl ?? null,
    retrievedAt: b.retrievedAt ?? null,
    adaptationNote: effectiveNote,
    questions: serializeQuestions(b.questions, id),
    unitIds: JSON.stringify(b.unitIds),
    timeLimitMin: b.timeLimitMin ?? null,
    pointsPerQuestion: b.pointsPerQuestion,
  };
}

/** 列表／前端用的安全 DTO：絕不把含答案的 questions 傳出去 */
export function safePaper(row: PaperRow) {
  let questionCount = 0;
  let unitIds: string[] = [];
  try { questionCount = (JSON.parse(row.questions) as unknown[]).length; } catch { /* 略 */ }
  try { unitIds = JSON.parse(row.unitIds) as string[]; } catch { /* 略 */ }
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    grade: row.grade,
    ownerId: row.ownerId,
    kind: row.kind,
    status: row.status,
    visibility: row.visibility,
    license: row.license,
    licenseUrl: row.licenseUrl,
    sourceUrl: row.sourceUrl,
    retrievedAt: row.retrievedAt,
    adaptationNote: row.adaptationNote,
    unitIds,
    questionCount,
    timeLimitMin: row.timeLimitMin,
    pointsPerQuestion: row.pointsPerQuestion,
    createdAt: row.createdAt,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    reviewNote: row.reviewNote,
  };
}
export type SafePaper = ReturnType<typeof safePaper>;

/** 依角色與 status／visibility 過濾：學生只看到已審核且公開／所屬班級的卷 */
export function visiblePapers(user: SessionUser): PaperRow[] {
  const db = getDb();
  const all = db.select().from(papers).orderBy(desc(papers.createdAt)).all();
  if (user.role === 'admin') return all;
  if (user.role === 'teacher') return all.filter((p) => p.ownerId === user.id || (p.status === 'approved' && p.visibility !== 'private'));

  let classOwnerId: string | null = null;
  if (user.role === 'student') {
    const me = db.select().from(users).where(eq(users.id, user.id)).get();
    if (me?.classId) {
      const cls = db.select().from(classes).where(eq(classes.id, me.classId)).get();
      classOwnerId = cls?.ownerId ?? null;
    }
  }
  return all.filter((p) => {
    if (p.status !== 'approved') return false;
    if (p.visibility === 'public') return true;
    if (p.visibility === 'class' && classOwnerId && p.ownerId === classOwnerId) return true;
    return false;
  });
}

/** 學生開卷：固定題序不洗牌，寫入 attempts 後沿用 /api/learn/answer 與 /api/learn/finish。只有 approved 才能開卷。 */
export function startPaperAttempt(user: SessionUser, paperId: string, assignmentId?: string) {
  if (user.role !== 'student') throw new HttpError(403, '只有學生可以作答試卷');
  const db = getDb();
  const p = visiblePapers(user).find((x) => x.id === paperId);
  if (!p || p.status !== 'approved') throw new HttpError(403, '此試卷尚未通過審核，或你沒有權限作答');
  if (p.kind === 'index') throw new HttpError(400, '此試卷只提供原站連結，請前往原站作答');

  // 由「老師派的固定卷功課」進入時，必須驗證功課屬於該生班級且指向同一份卷，
  // 並把 assignmentId 寫進 attempts，學生首頁的「已完成」判斷才會認得這次的作答。
  let asg: typeof assignments.$inferSelect | undefined;
  if (assignmentId) {
    asg = db.select().from(assignments).where(eq(assignments.id, assignmentId)).get();
    const me = db.select().from(users).where(eq(users.id, user.id)).get();
    if (!asg || !me || asg.classId !== me.classId || asg.mode !== 'fixed' || asg.paperId !== p.id) {
      throw new HttpError(400, '功課與試卷不符，或這份功課不屬於你的班級');
    }
  }

  let qs: ServerQuestion[] = [];
  try { qs = JSON.parse(p.questions) as ServerQuestion[]; } catch { /* 空 */ }
  if (!qs.length) throw new HttpError(500, '這份試卷沒有題目');
  const id = randomUUID();
  db.insert(attempts).values({
    id,
    userId: user.id,
    kind: 'paper',
    unitId: `paper:${p.id}`,
    assignmentId: assignmentId ?? null,
    questions: JSON.stringify(qs),
    total: qs.length,
    startedAt: Date.now(),
  }).run();
  const points = asg?.pointsPerQuestion ?? p.pointsPerQuestion;
  const limit = asg?.timeLimitMin ?? p.timeLimitMin;
  return {
    attemptId: id, kind: 'paper' as const, unit: { id: p.id, title: p.title }, questions: qs.map(toClient),
    meta: { pointsPerQuestion: points, timeLimitMin: limit, assignmentId: assignmentId ?? null },
  };
}
