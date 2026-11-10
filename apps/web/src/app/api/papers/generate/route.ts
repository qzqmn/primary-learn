import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { api, ok, readJson, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { licenseAllowed, loadCatalog } from '@/lib/content/registry';
import { paperContentValues, pickPaperQuestions, paperSchema, genSourceOptions, type PaperCreate } from '@/lib/papers';
import { SUBJECT_LABEL } from '@/lib/content/types';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const generateBody = z.object({
  title: z.string().trim().max(120).optional(),
  subject: z.enum(['math', 'english', 'chinese', 'general']),
  grade: z.coerce.number().int().min(1).max(6),
  /** 'builtin' = 內建參數化題庫；其他值 = 來源名稱（隨系統附帶的目錄包或後台上傳的包） */
  source: z.string().trim().min(1).max(300),
  count: z.coerce.number().int().min(1).max(50).default(10),
  timeLimitMin: z.coerce.number().int().min(1).max(300).nullable().optional(),
  pointsPerQuestion: z.coerce.number().int().min(1).max(100).default(10),
  visibility: z.enum(['private', 'class', 'public']).default('class'),
});

/**
 * 從題庫生成試卷：由系統從指定科目／年級／來源的單元自動抽題組卷，
 * 一律為「待審核」，須管理員覆核通過後學生才看得到。
 * 授權隨來源繼承：內建題庫為原創；內容包必須是系統已接受的開放授權。
 */
export const POST = api(async (req) => {
  const u = await requireUser(['admin', 'teacher']);
  const b = await readJson(req, generateBody);

  const units = loadCatalog().units.filter((x) => x.subject === b.subject && x.grade === b.grade && x.source === b.source);
  if (units.length === 0) {
    throw new HttpError(400, `「${b.source === 'builtin' ? '內建題庫' : b.source}」在 ${SUBJECT_LABEL[b.subject]} P${b.grade} 沒有單元，請換一個來源或年級。`);
  }

  // 授權檢查：同一來源的單元必須授權一致；內容包授權必須能被系統接受
  const licenses = [...new Set(units.map((x) => x.license).filter((x): x is string => !!x))];
  if (licenses.length > 1) {
    throw new HttpError(400, `所選來源包含多種授權（${licenses.join('、')}），請先在內容包統一授權，或改用單一來源生成。`);
  }
  const license = licenses[0];
  if (license && !licenseAllowed(license)) {
    throw new HttpError(400, `來源的授權「${license}」不被接受（NC／ND／無授權），無法用來生成試卷。`);
  }

  const questions = pickPaperQuestions(units, b.count, (Math.random() * 2 ** 31) | 0);
  if (questions.length === 0) throw new HttpError(400, '這個來源沒有可用的題目。');

  const withMeta = units.find((x) => x.licenseUrl || x.sourceUrl || x.retrievedAt);
  const input: PaperCreate = paperSchema.parse({
    title: b.title || `${SUBJECT_LABEL[b.subject]} P${b.grade} 自動生成練習卷`,
    subject: b.subject,
    grade: b.grade,
    kind: 'generated',
    visibility: b.visibility,
    license: license,
    licenseUrl: withMeta?.licenseUrl,
    sourceUrl: withMeta?.sourceUrl,
    retrievedAt: withMeta?.retrievedAt,
    adaptationNote:
      b.source === 'builtin'
        ? `本卷由系統內建題庫（原創內容）於 ${new Date().toISOString().slice(0, 10)} 自動生成 ${questions.length} 題。`
        : `本卷由內容包「${b.source}」於 ${new Date().toISOString().slice(0, 10)} 自動生成 ${questions.length} 題；授權與來源見下方欄位。`,
    questions: questions as unknown as PaperCreate['questions'],
    unitIds: units.map((x) => x.id).slice(0, 50),
    timeLimitMin: b.timeLimitMin ?? null,
    pointsPerQuestion: b.pointsPerQuestion,
  });

  const id = randomUUID();
  const values = paperContentValues(input, id);
  getDb().insert(papers).values({
    id,
    ownerId: u.id,
    status: 'pending',
    createdAt: Date.now(),
    ...values,
  }).run();
  audit({
    actorId: u.id,
    action: 'paper.generate',
    target: id,
    meta: { source: b.source, subject: b.subject, grade: b.grade, requested: b.count, generated: questions.length, license: license ?? null, status: 'pending' },
  });
  return ok({ id, questionCount: questions.length });
});

/** 後台生成表單的選項：科目 × 年級 × 來源 → 單元數／可用題數／是否參數化無上限 */
export const GET = api(async () => {
  await requireUser(['admin', 'teacher']);
  return ok({ sources: genSourceOptions() });
});
