import { getSqlite } from './db';
import { HttpError } from './http';

/** 固定視窗計數：每次呼叫計 1 次，超過上限回傳 false */
export function hit(key: string, max: number, windowSec: number): boolean {
  const db = getSqlite();
  const now = Date.now();
  const run = db.transaction(() => {
    const row = db.prepare('SELECT count, reset_at AS resetAt FROM rate_limits WHERE key = ?').get(key) as
      | { count: number; resetAt: number }
      | undefined;
    if (!row || row.resetAt <= now) {
      db.prepare('INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)').run(key, now + windowSec * 1000);
      return true;
    }
    if (row.count >= max) return false;
    db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').run(key);
    return true;
  });
  return run();
}

export function assertRate(key: string, max: number, windowSec: number, message = '操作太頻繁，請稍後再試') {
  if (!hit(key, max, windowSec)) throw new HttpError(429, message);
}

/** 只查詢、不計數（登入用：失敗才計數） */
export function isLimited(key: string, max: number): boolean {
  const row = getSqlite().prepare('SELECT count, reset_at AS resetAt FROM rate_limits WHERE key = ?').get(key) as
    | { count: number; resetAt: number }
    | undefined;
  return !!row && row.resetAt > Date.now() && row.count >= max;
}

export function recordFailure(key: string, windowSec: number) {
  hit(key, Number.MAX_SAFE_INTEGER, windowSec);
}

export function clearKey(key: string) {
  getSqlite().prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
}
