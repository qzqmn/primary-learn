import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { users } from './db/schema';
import { normalizeEmail, normalizeUsername } from './validators';

/** 登入欄位可填「用戶名」或「電郵」：含 @ 視為電郵 */
export function findUserByIdentifier(identifier: string) {
  const v = identifier.trim();
  const db = getDb();
  if (v.includes('@')) return db.select().from(users).where(eq(users.email, normalizeEmail(v))).get();
  return db.select().from(users).where(eq(users.username, normalizeUsername(v))).get();
}

export const normalizeIdentifier = (identifier: string) =>
  identifier.includes('@') ? normalizeEmail(identifier) : normalizeUsername(identifier);
