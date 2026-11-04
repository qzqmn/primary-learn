import crypto, { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from './db';
import { classes, users } from './db/schema';
import { hashPassword } from './password';
import { HttpError } from './http';
import { checkPassword } from './validators';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 不含易混淆的 I O 0 1
const WORDS = ['tiger', 'panda', 'apple', 'lemon', 'cloud', 'river', 'happy', 'sunny', 'mango', 'zebra', 'koala', 'peach', 'robot', 'candy', 'ocean', 'maple'];

/** 小朋友易輸入的初始密碼，例如 panda4821 */
export const friendlyPassword = () => WORDS[crypto.randomInt(WORDS.length)] + crypto.randomInt(1000, 10000);

export function newJoinCode(): string {
  const db = getDb();
  for (let i = 0; i < 50; i++) {
    const code = Array.from({ length: 6 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
    if (!db.select({ id: classes.id }).from(classes).where(eq(classes.joinCode, code)).get()) return code;
  }
  throw new HttpError(500, '無法產生班級代碼，請重試');
}
export const normalizeClassCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function createClass(ownerId: string, name: string, grade: number, joinMode: 'closed' | 'approval' | 'auto' = 'closed') {
  const id = randomUUID();
  getDb().insert(classes).values({ id, name, grade, joinCode: newJoinCode(), joinMode, ownerId, createdAt: Date.now() }).run();
  return id;
}

const NICK_RE = /^[\p{L}\p{N}_-]{1,12}$/u;
export function checkNickname(n: string): string | null {
  if (!NICK_RE.test(n)) return '暱稱須為 1–12 個字，只可用文字、數字、「_」「-」，不可有空格';
  return null;
}

function nicknameTaken(classId: string, nick: string): boolean {
  const lower = nick.toLowerCase();
  return getDb().select({ n: users.nickname }).from(users).where(eq(users.classId, classId)).all().some((r) => r.n?.toLowerCase() === lower);
}

export async function createStudent(
  classId: string,
  nicknameRaw: string,
  opts: { password?: string; note?: string; status?: 'active' | 'pending' } = {},
): Promise<{ id: string; nickname: string; password: string }> {
  const nickname = nicknameRaw.trim();
  const err = checkNickname(nickname);
  if (err) throw new HttpError(400, err);
  if (nicknameTaken(classId, nickname)) throw new HttpError(409, `暱稱「${nickname}」在這個班已被使用`);
  const password = opts.password ?? friendlyPassword();
  if (opts.password) {
    const pe = checkPassword(password, 'student', {});
    if (pe) throw new HttpError(400, pe);
  }
  const id = randomUUID();
  getDb()
    .insert(users)
    .values({
      id,
      role: 'student',
      displayName: nickname,
      nickname,
      classId,
      note: opts.note?.slice(0, 60) || null,
      passwordHash: await hashPassword(password),
      status: opts.status ?? 'active',
      createdAt: Date.now(),
    })
    .run();
  return { id, nickname, password };
}

/** CSV／純文字：每行「暱稱」或「暱稱,備註」；自動略過標題行。最多 200 行。 */
export async function importStudents(classId: string, text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 200) throw new HttpError(400, '一次最多匯入 200 位學生');
  const created: { nickname: string; password: string; note?: string }[] = [];
  const failed: { line: string; reason: string }[] = [];
  for (const [i, line] of lines.entries()) {
    const [nick, ...rest] = line.split(/[,，\t]/).map((s) => s.trim());
    if (i === 0 && /^(暱稱|nickname|name|姓名)$/i.test(nick)) continue;
    const note = rest.join(' ').trim() || undefined;
    try {
      const r = await createStudent(classId, nick, { note });
      created.push({ nickname: r.nickname, password: r.password, note });
    } catch (e) {
      failed.push({ line, reason: e instanceof HttpError ? e.message : '建立失敗' });
    }
  }
  return { created, failed };
}

export function studentsOf(classId: string) {
  return getDb().select().from(users).where(and(eq(users.classId, classId), eq(users.role, 'student'))).all().sort((a, b) => (a.nickname ?? '').localeCompare(b.nickname ?? '', 'zh-HK'));
}
export function classesOf(userId: string, role: string) {
  const db = getDb();
  const rows = role === 'admin' ? db.select().from(classes).all() : db.select().from(classes).where(eq(classes.ownerId, userId)).all();
  return rows.sort((a, b) => Number(a.archived) - Number(b.archived) || a.grade - b.grade || a.name.localeCompare(b.name, 'zh-HK'));
}
export const studentIdsOfClasses = (classIds: string[]) =>
  classIds.length ? getDb().select({ id: users.id }).from(users).where(and(inArray(users.classId, classIds), eq(users.role, 'student'))).all().map((r) => r.id) : [];
