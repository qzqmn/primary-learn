import { randomUUID } from 'node:crypto';
import { getDb, getSqlite } from './db';
import { badges } from './db/schema';
import { streakDays } from './stats';

export type BadgeCode = 'first-practice' | 'perfect-10' | 'streak-7' | 'century' | 'clean-slate';

export type BadgeDef = { code: BadgeCode; name: string; desc: string; hint: string };

/** 徽章定義（繁中）；/learn/badges 直接沿用，避免前後各寫一份。 */
export const BADGE_DEFS: BadgeDef[] = [
  { code: 'first-practice', name: '第一步', desc: '正式踏上學習旅程', hint: '完成 1 次練習' },
  { code: 'perfect-10', name: '十全十美', desc: '一份練習全部答對', hint: '單次 10 題全對' },
  { code: 'streak-7', name: '持之以恆', desc: '連續一星期都來練習', hint: '連續 7 日作答' },
  { code: 'century', name: '百題達人', desc: '累積答對一百題', hint: '累計答對 100 題' },
  { code: 'clean-slate', name: '錯題清零', desc: '把錯題本清得乾乾淨淨', hint: '曾有錯題，且目前沒有未解決錯題' },
];

/**
 * 依 attempts／attemptAnswers／mistakes 計算達成的徽章並寫入 badges 表。
 * 以 onConflictDoNothing 依賴 unique(userId, code)，重複呼叫不會產生重複徽章。
 * 回傳「目前所有已達成條件」的代碼（不論是否為本次新寫入）。
 */
export function awardBadges(userId: string): BadgeCode[] {
  const sqlite = getSqlite();
  const count = (sqlText: string) => (sqlite.prepare(sqlText).get(userId) as { n: number }).n;
  const earned: BadgeCode[] = [];

  // 1) 完成 1 次練習（attempts 有 finishedAt）
  if (count('SELECT count(*) AS n FROM attempts WHERE user_id = ? AND finished_at IS NOT NULL') >= 1) {
    earned.push('first-practice');
  }

  // 2) 單次 10 題全對：以實際作答紀錄分組判定，不只看 attempts.correct
  if (
    count(`SELECT count(*) AS n FROM (
              SELECT attempt_id FROM attempt_answers WHERE user_id = ?
              GROUP BY attempt_id HAVING count(*) = 10 AND sum(correct) = 10
            )`) >= 1
  ) {
    earned.push('perfect-10');
  }

  // 3) 連續 7 日：複用 stats.streakDays（只讀）
  if (streakDays(userId) >= 7) {
    earned.push('streak-7');
  }

  // 4) 累計答對 100 題
  if (count('SELECT coalesce(sum(correct), 0) AS n FROM attempt_answers WHERE user_id = ?') >= 100) {
    earned.push('century');
  }

  // 5) 錯題清零：曾經答錯過，且目前沒有未解決的錯題
  const everWrong = count('SELECT count(*) AS n FROM mistakes WHERE user_id = ?');
  const openWrong = count('SELECT count(*) AS n FROM mistakes WHERE user_id = ? AND resolved_at IS NULL');
  if (everWrong > 0 && openWrong === 0) {
    earned.push('clean-slate');
  }

  if (earned.length) {
    const now = Date.now();
    getDb()
      .insert(badges)
      .values(earned.map((code) => ({ id: randomUUID(), userId, code, earnedAt: now })))
      .onConflictDoNothing()
      .run();
  }
  return earned;
}

/** 已獲得徽章：code → 獲得時間（epoch 毫秒）。 */
export function earnedBadges(userId: string): Map<BadgeCode, number> {
  const rows = getSqlite()
    .prepare('SELECT code, earned_at AS earnedAt FROM badges WHERE user_id = ?')
    .all(userId) as { code: string; earnedAt: number }[];
  return new Map(rows.map((r) => [r.code as BadgeCode, r.earnedAt]));
}
