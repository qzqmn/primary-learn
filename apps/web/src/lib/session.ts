import { cookies } from 'next/headers';
import { and, eq, ne } from 'drizzle-orm';
import { getDb } from './db';
import { sessions, users, type Role } from './db/schema';
import { randomToken, sha256 } from './crypto';

export const COOKIE_NAME = 'hkpl_sid';
const HOUR = 3600_000;
const IDLE_MS: Record<Role, number> = { admin: 8 * HOUR, teacher: 8 * HOUR, parent: 24 * HOUR, student: 30 * 24 * HOUR };
const ABSOLUTE_MS = 7 * 24 * HOUR;
const ABSOLUTE_STUDENT_MS = 30 * 24 * HOUR;

export type SessionUser = {
  id: string;
  username: string | null;
  email: string | null;
  displayName: string;
  role: Role;
  emailVerified: boolean;
  mustChangePassword: boolean;
  sessionId: string;
};

export function createSession(userId: string, role: Role, meta: { ip?: string | null; userAgent?: string | null }) {
  const token = randomToken(32);
  const now = Date.now();
  const abs = role === 'student' ? ABSOLUTE_STUDENT_MS : ABSOLUTE_MS;
  getDb()
    .insert(sessions)
    .values({
      id: sha256(token),
      userId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + Math.min(IDLE_MS[role], abs),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 200) ?? null,
    })
    .run();
  return { token, maxAgeSec: Math.floor(abs / 1000) };
}

export function sessionCookie(token: string, maxAgeSec: number, secure: boolean) {
  return { name: COOKIE_NAME, value: token, httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge: maxAgeSec };
}

export function lookupSession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const db = getDb();
  const id = sha256(token);
  const row = db
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .get();
  if (!row) return null;
  const now = Date.now();
  const { s, u } = row;
  const abs = u.role === 'student' ? ABSOLUTE_STUDENT_MS : ABSOLUTE_MS;
  if (s.expiresAt <= now || s.createdAt + abs <= now || u.status !== 'active') {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  // 滑動過期：超過 5 分鐘才寫入一次，減少寫庫
  if (now - s.lastSeenAt > 5 * 60_000) {
    db.update(sessions)
      .set({ lastSeenAt: now, expiresAt: Math.min(now + IDLE_MS[u.role], s.createdAt + abs) })
      .where(eq(sessions.id, id))
      .run();
  }
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    emailVerified: !!u.emailVerifiedAt,
    mustChangePassword: u.mustChangePassword,
    sessionId: id,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return lookupSession(jar.get(COOKIE_NAME)?.value);
}

export function destroySession(sessionId: string) {
  getDb().delete(sessions).where(eq(sessions.id, sessionId)).run();
}

/** 刪除某用戶的所有會話（可保留目前這一個）；改密碼、重設密碼後必須呼叫 */
export function destroyUserSessions(userId: string, exceptSessionId?: string) {
  const cond = exceptSessionId ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)) : eq(sessions.userId, userId);
  getDb().delete(sessions).where(cond).run();
}
