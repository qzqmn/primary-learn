import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from './db';
import { assignments, attemptAnswers, attempts, mistakes } from './db/schema';
import { HttpError } from './http';
import type { SessionUser } from './session';
import { findUnit } from './content/registry';
import { fingerprint, generateQuestions, toClient } from './content/engine';
import { isCorrect } from './content/grade';
import type { ServerQuestion } from './content/types';
import { makeRng } from './content/rng';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(n)));

export function startAttempt(user: SessionUser, input: { unitId: string; count?: number; assignmentId?: string }) {
  if (user.role !== 'student') throw new HttpError(403, '只有學生可以做練習');
  const unit = findUnit(input.unitId);
  if (!unit) throw new HttpError(404, '找不到此單元');
  const db = getDb();
  let count = clamp(input.count ?? 10, 5, 20);
  let kind: 'practice' | 'assignment' = 'practice';
  if (input.assignmentId) {
    const a = db.select().from(assignments).where(eq(assignments.id, input.assignmentId)).get();
    const me = db.query.users.findFirst({ where: (u, { eq: e }) => e(u.id, user.id) }).sync();
    if (!a || !me || a.classId !== me.classId) throw new HttpError(404, '找不到此功課');
    if (a.unitId !== unit.id) throw new HttpError(400, '單元與功課不符');
    kind = 'assignment';
    count = a.count;
  }
  const seed = (Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0;
  const qs = generateQuestions(unit, count, seed);
  if (!qs.length) throw new HttpError(500, '這個單元暫時沒有題目');
  const id = randomUUID();
  db.insert(attempts).values({ id, userId: user.id, kind, unitId: unit.id, assignmentId: input.assignmentId ?? null, questions: JSON.stringify(qs), total: qs.length, startedAt: Date.now() }).run();
  return { attemptId: id, kind, unit: { id: unit.id, title: unit.title }, questions: qs.map(toClient) };
}

/** 把未解決的錯題重新出成一份練習 */
export function startRedo(user: SessionUser) {
  if (user.role !== 'student') throw new HttpError(403, '只有學生可以做練習');
  const db = getDb();
  const rows = db.select().from(mistakes).where(and(eq(mistakes.userId, user.id), isNull(mistakes.resolvedAt))).orderBy(desc(mistakes.createdAt)).limit(10).all();
  if (!rows.length) throw new HttpError(404, '錯題本是空的，太好了！');
  const r = makeRng(Date.now() >>> 0);
  const qs = rows.map((m) => {
    const q = JSON.parse(m.question) as ServerQuestion;
    return q.choices ? { ...q, choices: r.shuffle(q.choices) } : q;
  });
  const id = randomUUID();
  db.insert(attempts).values({ id, userId: user.id, kind: 'redo', unitId: qs[0].unit, questions: JSON.stringify(qs), total: qs.length, startedAt: Date.now() }).run();
  return { attemptId: id, kind: 'redo' as const, unit: { id: 'redo', title: '錯題本' }, questions: qs.map(toClient) };
}

function loadAttempt(user: SessionUser, attemptId: string) {
  const a = getDb().select().from(attempts).where(eq(attempts.id, attemptId)).get();
  if (!a || a.userId !== user.id) throw new HttpError(404, '找不到這次練習');
  return { a, qs: JSON.parse(a.questions) as ServerQuestion[] };
}

export function answerQuestion(user: SessionUser, input: { attemptId: string; idx: number; answer: string; timeMs?: number }) {
  const db = getDb();
  const { a, qs } = loadAttempt(user, input.attemptId);
  if (a.finishedAt) throw new HttpError(409, '這次練習已經完成');
  const q = qs[input.idx];
  if (!q) throw new HttpError(400, '題號不正確');
  const existing = db.select().from(attemptAnswers).where(and(eq(attemptAnswers.attemptId, a.id), eq(attemptAnswers.idx, input.idx))).get();
  if (existing) return { correct: existing.correct, answer: q.answer, explain: q.explain ?? null, repeated: true };

  const given = String(input.answer ?? '').slice(0, 100);
  const correct = isCorrect(q, given);
  const now = Date.now();
  db.transaction((tx) => {
    tx.insert(attemptAnswers).values({ attemptId: a.id, userId: user.id, idx: input.idx, unitId: q.unit, tag: q.tag, correct, given, timeMs: clamp(input.timeMs ?? 0, 0, 600_000), ts: now }).run();
    if (correct) tx.update(attempts).set({ correct: sql`${attempts.correct} + 1` }).where(eq(attempts.id, a.id)).run();
    const fp = fingerprint(q);
    if (correct) {
      tx.update(mistakes).set({ resolvedAt: now }).where(and(eq(mistakes.userId, user.id), eq(mistakes.fingerprint, fp), isNull(mistakes.resolvedAt))).run();
    } else {
      tx.insert(mistakes)
        .values({ id: randomUUID(), userId: user.id, unitId: q.unit, tag: q.tag, fingerprint: fp, question: JSON.stringify(q), createdAt: now })
        .onConflictDoUpdate({ target: [mistakes.userId, mistakes.fingerprint], set: { times: sql`${mistakes.times} + 1`, resolvedAt: null, question: JSON.stringify(q) } })
        .run();
    }
  });
  return { correct, answer: q.answer, explain: q.explain ?? null, repeated: false };
}

export function finishAttempt(user: SessionUser, attemptId: string) {
  const { a } = loadAttempt(user, attemptId);
  const db = getDb();
  const r = db.select({ n: sql<number>`count(*)`, c: sql<number>`coalesce(sum(${attemptAnswers.correct}), 0)` }).from(attemptAnswers).where(eq(attemptAnswers.attemptId, a.id)).get()!;
  if (!a.finishedAt) db.update(attempts).set({ finishedAt: Date.now(), correct: r.c }).where(eq(attempts.id, a.id)).run();
  const stars = a.total ? (r.c / a.total >= 0.9 ? 3 : r.c / a.total >= 0.7 ? 2 : r.c / a.total >= 0.5 ? 1 : 0) : 0;
  return { total: a.total, answered: r.n, correct: r.c, stars };
}
