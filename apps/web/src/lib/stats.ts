import { getSqlite } from './db';
import { allUnits } from './content/registry';
import { SUBJECT_LABEL, type Subject } from './content/types';

const DAY = 86_400_000;
const hkDate = (ms: number) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hong_Kong' }).format(new Date(ms));
const SUBJECTS: Subject[] = ['math', 'english', 'chinese', 'general'];

export type UnitProgress = { unitId: string; answered: number; correct: number; accuracy: number; stars: number };

/** 每個單元最近 30 題的表現 → 星星（≥10 題才計星）*/
export function unitProgress(userId: string): Map<string, UnitProgress> {
  const rows = getSqlite()
    .prepare(
      `SELECT unit_id AS unitId, COUNT(*) AS answered, SUM(correct) AS correct FROM (
         SELECT unit_id, correct, ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY id DESC) AS rn
         FROM attempt_answers WHERE user_id = ?) WHERE rn <= 30 GROUP BY unit_id`,
    )
    .all(userId) as { unitId: string; answered: number; correct: number }[];
  const m = new Map<string, UnitProgress>();
  for (const r of rows) {
    const accuracy = r.answered ? r.correct / r.answered : 0;
    const stars = r.answered < 10 ? 0 : accuracy >= 0.9 ? 3 : accuracy >= 0.8 ? 2 : accuracy >= 0.6 ? 1 : 0;
    m.set(r.unitId, { unitId: r.unitId, answered: r.answered, correct: r.correct, accuracy, stars });
  }
  return m;
}

/** 連續練習日數（以香港時區計；今日未練習但昨日有，連續仍保留） */
export function streakDays(userId: string, now = Date.now()): number {
  const rows = getSqlite().prepare('SELECT DISTINCT ts FROM attempt_answers WHERE user_id = ? AND ts > ? ORDER BY ts DESC').all(userId, now - 400 * DAY) as { ts: number }[];
  const days = new Set(rows.map((r) => hkDate(r.ts)));
  let d = now;
  if (!days.has(hkDate(d))) d -= DAY;
  let n = 0;
  while (days.has(hkDate(d))) {
    n++;
    d -= DAY;
  }
  return n;
}

export function studentSummary(userId: string) {
  const db = getSqlite();
  const tot = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(correct),0) AS c, COALESCE(SUM(time_ms),0) AS t, MAX(ts) AS last FROM attempt_answers WHERE user_id = ?').get(userId) as { n: number; c: number; t: number; last: number | null };
  const week = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(correct),0) AS c FROM attempt_answers WHERE user_id = ? AND ts > ?').get(userId, Date.now() - 7 * DAY) as { n: number; c: number };
  const tags = db
    .prepare('SELECT tag, unit_id AS unitId, COUNT(*) AS n, SUM(correct) AS c FROM attempt_answers WHERE user_id = ? GROUP BY tag, unit_id ORDER BY (1.0 * SUM(correct) / COUNT(*)) ASC, COUNT(*) DESC')
    .all(userId) as { tag: string; unitId: string; n: number; c: number }[];
  const recent = db
    .prepare('SELECT id, kind, unit_id AS unitId, total, correct, started_at AS startedAt, finished_at AS finishedAt FROM attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 20')
    .all(userId) as { id: string; kind: string; unitId: string; total: number; correct: number; startedAt: number; finishedAt: number | null }[];
  const open = db.prepare('SELECT COUNT(*) AS n FROM mistakes WHERE user_id = ? AND resolved_at IS NULL').get(userId) as { n: number };
  return { answered: tot.n, correct: tot.c, accuracy: tot.n ? tot.c / tot.n : null, minutes: Math.round(tot.t / 60000), lastActive: tot.last, weekAnswered: week.n, weekAccuracy: week.n ? week.c / week.n : null, tags, recent, openMistakes: open.n, streak: streakDays(userId) };
}

export function classOverview(classId: string) {
  return getSqlite()
    .prepare(
      `SELECT u.id, u.nickname, u.note, u.status,
         (SELECT COUNT(*) FROM attempt_answers a WHERE a.user_id = u.id) AS answered,
         (SELECT COALESCE(SUM(correct),0) FROM attempt_answers a WHERE a.user_id = u.id) AS correct,
         (SELECT COUNT(*) FROM attempt_answers a WHERE a.user_id = u.id AND a.ts > ?) AS weekAnswered,
         (SELECT MAX(ts) FROM attempt_answers a WHERE a.user_id = u.id) AS lastActive,
         (SELECT COUNT(*) FROM mistakes m WHERE m.user_id = u.id AND m.resolved_at IS NULL) AS openMistakes
       FROM users u WHERE u.class_id = ? AND u.role = 'student' ORDER BY u.nickname`,
    )
    .all(Date.now() - 7 * DAY, classId) as { id: string; nickname: string; note: string | null; status: string; answered: number; correct: number; weekAnswered: number; lastActive: number | null; openMistakes: number }[];
}

/** 功課完成率：有完成記錄（finished）的學生 / 班內有效學生 */
export function assignmentStatus(assignmentId: string, classId: string) {
  const db = getSqlite();
  const students = db.prepare("SELECT id, nickname FROM users WHERE class_id = ? AND role = 'student' AND status = 'active' ORDER BY nickname").all(classId) as { id: string; nickname: string }[];
  const rows = db
    .prepare('SELECT user_id AS userId, MAX(1.0 * correct / NULLIF(total,0)) AS best, MAX(finished_at) AS done FROM attempts WHERE assignment_id = ? AND finished_at IS NOT NULL GROUP BY user_id')
    .all(assignmentId) as { userId: string; best: number | null; done: number }[];
  const by = new Map(rows.map((r) => [r.userId, r]));
  return students.map((s) => ({ ...s, done: by.has(s.id), best: by.get(s.id)?.best ?? null, doneAt: by.get(s.id)?.done ?? null }));
}

export function systemOverview() {
  const db = getSqlite();
  const q = (sql: string, ...p: unknown[]) => (db.prepare(sql).get(...p) as { n: number }).n;
  const week = Date.now() - 7 * DAY;
  const today = Date.now() - DAY;
  const ans = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(correct),0) AS c FROM attempt_answers WHERE ts > ?').get(week) as { n: number; c: number };
  return {
    students: q("SELECT COUNT(*) AS n FROM users WHERE role='student' AND status='active'"),
    teachers: q("SELECT COUNT(*) AS n FROM users WHERE role='teacher' AND status='active'"),
    parents: q("SELECT COUNT(*) AS n FROM users WHERE role='parent' AND status='active'"),
    pendingTeachers: q("SELECT COUNT(*) AS n FROM users WHERE role='teacher' AND status='pending'"),
    activeToday: q('SELECT COUNT(DISTINCT user_id) AS n FROM attempt_answers WHERE ts > ?', today),
    activeWeek: q('SELECT COUNT(DISTINCT user_id) AS n FROM attempt_answers WHERE ts > ?', week),
    answersWeek: ans.n,
    accuracyWeek: ans.n ? ans.c / ans.n : null,
    classes: q('SELECT COUNT(*) AS n FROM classes WHERE archived = 0'),
  };
}

/** 老師範圍內的概況（只計自己班級的學生） */
export function teacherOverview(classIds: string[]) {
  if (!classIds.length) return { students: 0, activeToday: 0, activeWeek: 0, answersWeek: 0, accuracyWeek: null as number | null };
  const db = getSqlite();
  const ph = classIds.map(() => '?').join(',');
  const ids = `SELECT id FROM users WHERE class_id IN (${ph}) AND role='student'`;
  const n = (sql: string, ...p: unknown[]) => (db.prepare(sql).get(...classIds, ...p) as { n: number }).n;
  const week = Date.now() - 7 * DAY;
  const ans = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(correct),0) AS c FROM attempt_answers WHERE user_id IN (${ids}) AND ts > ?`).get(...classIds, week) as { n: number; c: number };
  return {
    students: n(`SELECT COUNT(*) AS n FROM users WHERE class_id IN (${ph}) AND role='student' AND status='active'`),
    activeToday: n(`SELECT COUNT(DISTINCT user_id) AS n FROM attempt_answers WHERE user_id IN (${ids}) AND ts > ?`, Date.now() - DAY),
    activeWeek: n(`SELECT COUNT(DISTINCT user_id) AS n FROM attempt_answers WHERE user_id IN (${ids}) AND ts > ?`, week),
    answersWeek: ans.n,
    accuracyWeek: ans.n ? ans.c / ans.n : null,
  };
}

/** 學習熱圖：4 科 × P1–P6，每格彙總該格所有單元的作答數與正確率 */
export type HeatCell = { subject: Subject; grade: number; answered: number; correct: number; accuracy: number | null };

export function heatmapData(userId: string): Map<string, HeatCell> {
  const cellOf = new Map<string, string>();
  for (const u of allUnits()) cellOf.set(u.id, `${u.subject}:${u.grade}`);
  const cells = new Map<string, HeatCell>();
  for (const s of SUBJECTS) {
    for (let g = 1; g <= 6; g++) cells.set(`${s}:${g}`, { subject: s, grade: g, answered: 0, correct: 0, accuracy: null });
  }
  const rows = getSqlite()
    .prepare('SELECT unit_id AS unitId, COUNT(*) AS n, COALESCE(SUM(correct),0) AS c FROM attempt_answers WHERE user_id = ? GROUP BY unit_id')
    .all(userId) as { unitId: string; n: number; c: number }[];
  for (const r of rows) {
    const key = cellOf.get(r.unitId);
    if (!key) continue;
    const cell = cells.get(key);
    if (!cell) continue;
    cell.answered += r.n;
    cell.correct += r.c;
  }
  for (const cell of cells.values()) cell.accuracy = cell.answered ? cell.correct / cell.answered : null;
  return cells;
}

/** 家長只讀週報：近 7 日作答／正確率、連續日數、各科正確率、最近 5 次練習（純查詢，不含題目答案） */
export type SubjectAccuracy = { subject: Subject; label: string; answered: number; correct: number; accuracy: number | null };
export type RecentPractice = { id: string; kind: string; unitId: string; total: number; correct: number; startedAt: number; finishedAt: number | null };
export type WeeklyReport = {
  answered: number;
  correct: number;
  accuracy: number | null;
  streak: number;
  subjects: SubjectAccuracy[];
  recent: RecentPractice[];
};

export function parentWeeklyReport(studentId: string, now = Date.now()): WeeklyReport {
  const db = getSqlite();
  const week = db
    .prepare('SELECT COUNT(*) AS n, COALESCE(SUM(correct),0) AS c FROM attempt_answers WHERE user_id = ? AND ts > ?')
    .get(studentId, now - 7 * DAY) as { n: number; c: number };

  const subjectOf = new Map<string, Subject>();
  for (const u of allUnits()) subjectOf.set(u.id, u.subject);
  const acc = new Map<Subject, { n: number; c: number }>();
  for (const s of SUBJECTS) acc.set(s, { n: 0, c: 0 });
  const byUnit = db
    .prepare('SELECT unit_id AS unitId, COUNT(*) AS n, COALESCE(SUM(correct),0) AS c FROM attempt_answers WHERE user_id = ? GROUP BY unit_id')
    .all(studentId) as { unitId: string; n: number; c: number }[];
  for (const r of byUnit) {
    const s = subjectOf.get(r.unitId);
    if (!s) continue;
    const a = acc.get(s)!;
    a.n += r.n;
    a.c += r.c;
  }
  const subjects = SUBJECTS.map((s) => {
    const a = acc.get(s)!;
    return { subject: s, label: SUBJECT_LABEL[s], answered: a.n, correct: a.c, accuracy: a.n ? a.c / a.n : null };
  });

  const recent = db
    .prepare('SELECT id, kind, unit_id AS unitId, total, correct, started_at AS startedAt, finished_at AS finishedAt FROM attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 5')
    .all(studentId) as RecentPractice[];

  return {
    answered: week.n,
    correct: week.c,
    accuracy: week.n ? week.c / week.n : null,
    streak: streakDays(studentId, now),
    subjects,
    recent,
  };
}
