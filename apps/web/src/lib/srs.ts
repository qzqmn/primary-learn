import { randomUUID } from 'node:crypto';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { getDb } from './db';
import { srsCards } from './db/schema';
import { fingerprint } from './content/engine';
import type { ServerQuestion } from './content/types';

const DAY = 86_400_000;

/** SM-2 簡化版的排程狀態（ease 為整數 ×100） */
export type SrsState = {
  intervalDays: number;
  ease: number;
  repetitions: number;
  lapses: number;
};

export type SrsSchedule = SrsState & { dueAt: number; lastReviewAt: number };

/**
 * 依答題結果計算下一次排程。
 * 正確：repetitions+1，間隔 1 → 6 → ceil(上次間隔 × ease/100)，ease +10（上限 300）。
 * 錯誤：lapses+1、repetitions 歸零、間隔回到 1、ease -20（下限 130）。
 */
export function schedule(card: SrsState, correct: boolean, now: number): SrsSchedule {
  let { intervalDays, ease, repetitions, lapses } = card;
  if (correct) {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.max(1, Math.ceil((intervalDays * ease) / 100));
    ease = Math.min(300, ease + 10);
  } else {
    lapses += 1;
    repetitions = 0;
    intervalDays = 1;
    ease = Math.max(130, ease - 20);
  }
  return {
    intervalDays,
    ease,
    repetitions,
    lapses,
    dueAt: now + intervalDays * DAY,
    lastReviewAt: now,
  };
}

/** 批改後同步卡片：答錯建立／重排卡片；答對時只更新已存在的卡片。 */
export function syncFromMistake(userId: string, q: ServerQuestion, correct: boolean, now = Date.now()): void {
  const db = getDb();
  const fp = fingerprint(q);
  const existing = db
    .select()
    .from(srsCards)
    .where(and(eq(srsCards.userId, userId), eq(srsCards.fingerprint, fp)))
    .get();
  const question = JSON.stringify(q);

  if (correct) {
    if (!existing) return; // 沒答錯過，無需排程
    const s = schedule(existing, true, now);
    db.update(srsCards)
      .set({ ...s, question, unitId: q.unit, tag: q.tag })
      .where(eq(srsCards.id, existing.id))
      .run();
    return;
  }

  if (existing) {
    const s = schedule(existing, false, now);
    db.update(srsCards)
      .set({ ...s, question, unitId: q.unit, tag: q.tag })
      .where(eq(srsCards.id, existing.id))
      .run();
    return;
  }

  // 首次答錯：建立一張明日到期的新卡（預設狀態）
  db.insert(srsCards)
    .values({
      id: randomUUID(),
      userId,
      unitId: q.unit,
      tag: q.tag,
      fingerprint: fp,
      question,
      dueAt: now + DAY,
      intervalDays: 1,
      ease: 250,
      repetitions: 0,
      lapses: 0,
      lastReviewAt: null,
      createdAt: now,
    })
    .run();
}

/** 依到期時間取出最多 limit 張卡片 */
export function dueCards(userId: string, limit = 10, now = Date.now()) {
  return getDb()
    .select()
    .from(srsCards)
    .where(and(eq(srsCards.userId, userId), lte(srsCards.dueAt, now)))
    .orderBy(asc(srsCards.dueAt))
    .limit(limit)
    .all();
}

/** 到期卡片數 */
export function countDue(userId: string, now = Date.now()): number {
  const r = getDb()
    .select({ n: sql<number>`count(*)` })
    .from(srsCards)
    .where(and(eq(srsCards.userId, userId), lte(srsCards.dueAt, now)))
    .get();
  return r?.n ?? 0;
}
