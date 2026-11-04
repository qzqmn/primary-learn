import { and, eq } from 'drizzle-orm';
import { getDb } from './db';
import { classes, parentLinks, users } from './db/schema';
import { HttpError } from './http';
import type { SessionUser } from './session';

export type ClassRow = typeof classes.$inferSelect;
export type UserRow = typeof users.$inferSelect;

/** 管理員可管理所有班；老師只可管理自己擁有的班 */
export function getManagedClass(user: SessionUser, classId: string): ClassRow {
  const c = getDb().select().from(classes).where(eq(classes.id, classId)).get();
  if (!c) throw new HttpError(404, '找不到此班級');
  if (user.role === 'admin' || (user.role === 'teacher' && c.ownerId === user.id)) return c;
  throw new HttpError(403, '你沒有權限管理此班級');
}

/** 取得「可查看其資料」的學生：本人、其老師、已綁定的家長、管理員 */
export function getViewableStudent(user: SessionUser, studentId: string): { student: UserRow; cls: ClassRow | null } {
  const student = getDb().select().from(users).where(and(eq(users.id, studentId), eq(users.role, 'student'))).get();
  if (!student) throw new HttpError(404, '找不到此學生');
  const cls = student.classId ? (getDb().select().from(classes).where(eq(classes.id, student.classId)).get() ?? null) : null;
  const allowed =
    user.role === 'admin' ||
    (user.role === 'student' && user.id === student.id) ||
    (user.role === 'teacher' && !!cls && cls.ownerId === user.id) ||
    (user.role === 'parent' && !!getDb().select().from(parentLinks).where(and(eq(parentLinks.parentId, user.id), eq(parentLinks.studentId, studentId))).get());
  if (!allowed) throw new HttpError(403, '你沒有權限查看此學生');
  return { student, cls };
}

export const isStaff = (u: SessionUser) => u.role === 'admin' || u.role === 'teacher';
