import { getSqlite } from './db';
import { getSetting } from './settings';

/**
 * 資料保留：只清理隨時間累積的歷程資料（attempts／attemptAnswers／emailLogs／auditLogs）。
 * users、mistakes、contentPacks 屬於帳號、學習紀錄與題庫，永不因保留期限刪除。
 */
export const DEFAULT_RETENTION_DAYS = 365;
export const MAX_RETENTION_DAYS = 3650;
const DAY_MS = 86_400_000;
const SETTING_KEY = 'retentionDays';

export function getRetentionDays(): number {
  const raw = getSetting(SETTING_KEY);
  if (raw === null) return DEFAULT_RETENTION_DAYS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_RETENTION_DAYS;
  return Math.min(n, MAX_RETENTION_DAYS);
}

export type RetentionCounts = {
  attempts: number;
  attemptAnswers: number;
  emailLogs: number;
  auditLogs: number;
  total: number;
};
export type RetentionPreview = RetentionCounts & { days: number; cutoff: number; enabled: boolean };

const EMPTY: RetentionCounts = { attempts: 0, attemptAnswers: 0, emailLogs: 0, auditLogs: 0, total: 0 };
const total = (c: Omit<RetentionCounts, 'total'>) => c.attempts + c.attemptAnswers + c.emailLogs + c.auditLogs;

/**
 * 預覽將被刪除的筆數。attemptAnswers 只計入「所屬 attempt 已過期」的作答，
 * 與 runRetention 的刪除條件完全一致，避免預覽與實際執行不一致。
 */
export function previewRetention(days: number = getRetentionDays()): RetentionPreview {
  if (days <= 0) return { ...EMPTY, days, cutoff: 0, enabled: false };
  const cutoff = Date.now() - days * DAY_MS;
  const db = getSqlite();
  const one = (sql: string, ...args: (number | string)[]) => (db.prepare(sql).get(...args) as { n: number }).n;
  const attempts = one('SELECT COUNT(*) AS n FROM attempts WHERE started_at < ?', cutoff);
  const attemptAnswers = one(
    'SELECT COUNT(*) AS n FROM attempt_answers WHERE attempt_id IN (SELECT id FROM attempts WHERE started_at < ?)',
    cutoff,
  );
  const emailLogs = one('SELECT COUNT(*) AS n FROM email_logs WHERE ts < ?', cutoff);
  const auditLogs = one('SELECT COUNT(*) AS n FROM audit_logs WHERE ts < ?', cutoff);
  const counts = { attempts, attemptAnswers, emailLogs, auditLogs };
  return { ...counts, total: total(counts), days, cutoff, enabled: true };
}

export type RetentionResult = { days: number; cutoff: number; deleted: RetentionCounts };

/** 執行清理；全部刪除在同一個 DB transaction 內完成，失敗時整體回滾。days = 0 表示不清理。 */
export function runRetention(days: number = getRetentionDays()): RetentionResult {
  if (days <= 0) return { days, cutoff: 0, deleted: { ...EMPTY } };
  const cutoff = Date.now() - days * DAY_MS;
  const db = getSqlite();
  const deleted = db.transaction(() => {
    // 先刪子表：作答紀錄必須跟著所屬的 attempt 一併刪除，不能留下孤兒資料
    const attemptAnswers = db
      .prepare('DELETE FROM attempt_answers WHERE attempt_id IN (SELECT id FROM attempts WHERE started_at < ?)')
      .run(cutoff).changes;
    const attempts = db.prepare('DELETE FROM attempts WHERE started_at < ?').run(cutoff).changes;
    const emailLogs = db.prepare('DELETE FROM email_logs WHERE ts < ?').run(cutoff).changes;
    const auditLogs = db.prepare('DELETE FROM audit_logs WHERE ts < ?').run(cutoff).changes;
    const counts = { attempts, attemptAnswers, emailLogs, auditLogs };
    return { ...counts, total: total(counts) };
  })();
  return { days, cutoff, deleted };
}
