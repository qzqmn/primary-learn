import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { getDb } from './db';
import { broadcastReceipts, broadcasts, classes, emailQueue, parentLinks, unsubscribes, users } from './db/schema';
import { HttpError } from './http';
import type { SessionUser } from './session';
import { hmac, safeEqual } from './crypto';
import { isMailReady, orgName, sendMail } from './mail';
import { broadcastMail } from './mail/templates';

export type Audience = { all?: boolean; roles?: ('teacher' | 'parent' | 'student')[]; classIds?: string[] };

const APP_URL = () => (process.env.APP_URL || '').replace(/\/$/, '');
export const unsubSig = (email: string) => hmac('unsub', email);
export const unsubscribeUrl = (email: string) => `${APP_URL()}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubSig(email)}`;
export const verifyUnsub = (email: string, t: string) => safeEqual(unsubSig(email), t);

/** 解析收件人。老師只能對自己班的學生及其已綁定的家長廣播；管理員可按角色、班級或全體。 */
export function resolveRecipients(sender: SessionUser, aud: Audience): { id: string; role: string; email: string | null; verified: boolean; displayName: string }[] {
  const db = getDb();
  const cols = { id: users.id, role: users.role, email: users.email, verified: users.emailVerifiedAt, displayName: users.displayName };
  let rows: { id: string; role: string; email: string | null; verified: number | null; displayName: string }[] = [];
  if (sender.role === 'teacher') {
    const own = db.select({ id: classes.id }).from(classes).where(eq(classes.ownerId, sender.id)).all().map((c) => c.id);
    const target = aud.classIds?.length ? aud.classIds.filter((c) => own.includes(c)) : own;
    if (!target.length) throw new HttpError(400, '請選擇你負責的班級');
    const students = db.select(cols).from(users).where(and(inArray(users.classId, target), eq(users.role, 'student'), eq(users.status, 'active'))).all();
    const sIds = students.map((s) => s.id);
    const parents = sIds.length
      ? db.select(cols).from(users).innerJoin(parentLinks, eq(parentLinks.parentId, users.id)).where(and(inArray(parentLinks.studentId, sIds), eq(users.status, 'active'))).all()
      : [];
    rows = [...students, ...parents];
  } else if (sender.role === 'admin') {
    const roles = aud.all ? ['teacher', 'parent', 'student'] : (aud.roles ?? []);
    const parts: typeof rows = [];
    if (roles.length && !aud.classIds?.length) parts.push(...db.select(cols).from(users).where(and(inArray(users.role, roles as ('teacher' | 'parent' | 'student')[]), eq(users.status, 'active'))).all());
    if (aud.classIds?.length) {
      const students = db.select(cols).from(users).where(and(inArray(users.classId, aud.classIds), eq(users.role, 'student'), eq(users.status, 'active'))).all();
      parts.push(...students);
      if (roles.includes('parent') || aud.all) {
        const sIds = students.map((s) => s.id);
        if (sIds.length) parts.push(...db.select(cols).from(users).innerJoin(parentLinks, eq(parentLinks.parentId, users.id)).where(and(inArray(parentLinks.studentId, sIds), eq(users.status, 'active'))).all());
      }
    }
    rows = parts;
  } else throw new HttpError(403, '沒有權限發送廣播');
  const seen = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (r.id !== sender.id) seen.set(r.id, r);
  return [...seen.values()].map((r) => ({ id: r.id, role: r.role, email: r.email, verified: !!r.verified, displayName: r.displayName }));
}

export function createBroadcast(sender: SessionUser, input: { title: string; body: string; audience: Audience; sendEmail: boolean; pinned: boolean; expiresAt?: number | null }) {
  const recipients = resolveRecipients(sender, input.audience);
  if (!recipients.length) throw new HttpError(400, '沒有符合條件的收件人');
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  let queued = 0;
  db.transaction((tx) => {
    tx.insert(broadcasts).values({ id, title: input.title, body: input.body, audience: JSON.stringify(input.audience), sendEmail: input.sendEmail, pinned: input.pinned, createdBy: sender.id, createdAt: now, expiresAt: input.expiresAt ?? null, recipients: recipients.length }).run();
    for (let i = 0; i < recipients.length; i += 500) tx.insert(broadcastReceipts).values(recipients.slice(i, i + 500).map((r) => ({ broadcastId: id, userId: r.id }))).run();
    if (input.sendEmail && isMailReady()) {
      const org = orgName();
      const unsub = new Set(tx.select().from(unsubscribes).all().map((u) => u.email));
      for (const r of recipients) {
        if (r.role === 'student' || !r.email || !r.verified || unsub.has(r.email)) continue;
        const m = broadcastMail({ org, title: input.title, body: input.body, unsubscribeUrl: unsubscribeUrl(r.email), name: r.displayName });
        tx.insert(emailQueue).values({ id: randomUUID(), broadcastId: id, toEmail: r.email, subject: m.subject, html: m.html, text: m.text, nextAt: now, createdAt: now }).run();
        queued++;
      }
    }
  });
  return { id, recipients: recipients.length, emailsQueued: queued };
}

export function noticesFor(userId: string, limit = 20) {
  const now = Date.now();
  return getDb()
    .select({ id: broadcasts.id, title: broadcasts.title, body: broadcasts.body, pinned: broadcasts.pinned, createdAt: broadcasts.createdAt, readAt: broadcastReceipts.readAt })
    .from(broadcastReceipts)
    .innerJoin(broadcasts, eq(broadcasts.id, broadcastReceipts.broadcastId))
    .where(and(eq(broadcastReceipts.userId, userId), or(isNull(broadcasts.expiresAt), sql`${broadcasts.expiresAt} > ${now}`)))
    .orderBy(desc(broadcasts.pinned), desc(broadcasts.createdAt))
    .limit(limit)
    .all();
}
export function markNoticesRead(userId: string, ids?: string[]) {
  const where = ids?.length ? and(eq(broadcastReceipts.userId, userId), isNull(broadcastReceipts.readAt), inArray(broadcastReceipts.broadcastId, ids)) : and(eq(broadcastReceipts.userId, userId), isNull(broadcastReceipts.readAt));
  getDb().update(broadcastReceipts).set({ readAt: Date.now() }).where(where).run();
}
export function broadcastStats(id: string) {
  const r = getDb().select({ total: sql<number>`count(*)`, read: sql<number>`count(${broadcastReceipts.readAt})` }).from(broadcastReceipts).where(eq(broadcastReceipts.broadcastId, id)).get()!;
  const mails = getDb().select({ status: emailQueue.status, n: sql<number>`count(*)` }).from(emailQueue).where(eq(emailQueue.broadcastId, id)).groupBy(emailQueue.status).all();
  return { ...r, mails: Object.fromEntries(mails.map((m) => [m.status, m.n])) as Record<string, number> };
}

let draining = false;
/** 背景發送廣播郵件：每次最多 5 封、間隔 0.6 秒（Resend 預設約 2 次/秒）；失敗指數退避，5 次後放棄。 */
export async function drainEmailQueue() {
  if (draining || !isMailReady()) return;
  draining = true;
  try {
    const db = getDb();
    const rows = db.select().from(emailQueue).where(and(eq(emailQueue.status, 'pending'), lte(emailQueue.nextAt, Date.now()))).limit(5).all();
    for (const row of rows) {
      const unsub = db.select().from(unsubscribes).where(eq(unsubscribes.email, row.toEmail)).get();
      if (unsub) {
        db.update(emailQueue).set({ status: 'failed', error: '收件人已退訂' }).where(eq(emailQueue.id, row.id)).run();
        continue;
      }
      try {
        await sendMail({ to: row.toEmail, purpose: 'broadcast', subject: row.subject, html: row.html, text: row.text });
        db.update(emailQueue).set({ status: 'sent', attempts: row.attempts + 1, error: null }).where(eq(emailQueue.id, row.id)).run();
      } catch (e) {
        const attempts = row.attempts + 1;
        const limitHit = e instanceof HttpError && e.status === 429;
        db.update(emailQueue)
          .set({ attempts: limitHit ? row.attempts : attempts, status: !limitHit && attempts >= 5 ? 'failed' : 'pending', error: (e instanceof Error ? e.message : String(e)).slice(0, 200), nextAt: Date.now() + (limitHit ? 3600_000 : attempts * attempts * 60_000) })
          .where(eq(emailQueue.id, row.id))
          .run();
      }
      await new Promise((r) => setTimeout(r, 600));
    }
  } finally {
    draining = false;
  }
}
