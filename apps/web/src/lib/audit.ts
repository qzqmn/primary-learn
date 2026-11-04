import { getDb } from './db';
import { auditLogs } from './db/schema';

export function audit(e: { actorId?: string | null; action: string; target?: string | null; ip?: string | null; meta?: Record<string, unknown> }) {
  try {
    getDb()
      .insert(auditLogs)
      .values({
        ts: Date.now(),
        actorId: e.actorId ?? null,
        action: e.action,
        target: e.target ?? null,
        ip: e.ip ?? null,
        meta: e.meta ? JSON.stringify(e.meta) : null,
      })
      .run();
  } catch (err) {
    console.error('[audit] failed', err);
  }
}
