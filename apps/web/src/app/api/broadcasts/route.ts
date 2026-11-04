import { z } from 'zod';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { createBroadcast } from '@/lib/broadcast';
import { assertRate } from '@/lib/ratelimit';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const POST = api(async (req) => {
  const u = await requireUser(['admin', 'teacher']);
  assertRate(`bc:${u.id}`, 20, 3600, '發送太頻繁，請稍後再試');
  const b = await readJson(
    req,
    z.object({
      title: z.string().trim().min(1, '請輸入標題').max(60),
      body: z.string().trim().min(1, '請輸入內容').max(2000),
      audience: z.object({ all: z.boolean().optional(), roles: z.array(z.enum(['teacher', 'parent', 'student'])).optional(), classIds: z.array(z.string().max(60)).max(50).optional() }),
      sendEmail: z.boolean().default(false),
      pinned: z.boolean().default(false),
      expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
    }),
  );
  const r = createBroadcast(u, { ...b, expiresAt: b.expiresInDays ? Date.now() + b.expiresInDays * 86_400_000 : null });
  audit({ actorId: u.id, action: 'broadcast.send', target: r.id, meta: { recipients: r.recipients, emails: r.emailsQueued } });
  return ok(r);
});
