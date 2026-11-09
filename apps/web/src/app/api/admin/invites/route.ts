import { z } from 'zod';
import { desc } from 'drizzle-orm';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { invites } from '@/lib/db/schema';
import { randomToken, sha256 } from '@/lib/crypto';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;

/** 列出最近產生的邀請（不含任何密鑰或明文邀請碼） */
export const GET = api(async () => {
  await requireUser(['admin']);
  const rows = getDb()
    .select({ id: invites.id, role: invites.role, expiresAt: invites.expiresAt, maxUses: invites.maxUses, uses: invites.uses, createdBy: invites.createdBy, createdAt: invites.createdAt })
    .from(invites)
    .orderBy(desc(invites.createdAt))
    .limit(50)
    .all();
  return ok({ invites: rows });
});

const body = z.object({
  role: z.enum(['teacher', 'parent']),
  maxUses: z.number().int().min(1, '可使用次數至少為 1').max(50).default(1),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

/** 產生一次性邀請碼：明文只在此回應出現一次，資料庫只存 SHA-256 hash */
export const POST = api(async (req) => {
  const me = await requireUser(['admin']);
  const b = await readJson(req, body);
  const now = Date.now();
  const code = randomToken(24);
  const id = randomToken(12);
  const expiresAt = now + b.expiresInDays * DAY_MS;
  getDb()
    .insert(invites)
    .values({ id, role: b.role, codeHash: sha256(code), expiresAt, maxUses: b.maxUses, uses: 0, createdBy: me.id, createdAt: now })
    .run();
  const base = (process.env.APP_URL || req.nextUrl.origin).replace(/\/+$/, '');
  const url = `${base}/invite/${code}`;
  audit({ actorId: me.id, action: 'invite.created', target: id, meta: { role: b.role, maxUses: b.maxUses, expiresInDays: b.expiresInDays } });
  return ok({
    code,
    url,
    invite: { id, role: b.role, expiresAt, maxUses: b.maxUses, uses: 0, createdBy: me.id, createdAt: now },
  });
});
