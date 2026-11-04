import { z } from 'zod';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { createClass } from '@/lib/classes';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const POST = api(async (req) => {
  const u = await requireUser(['admin', 'teacher']);
  const b = await readJson(req, z.object({ name: z.string().trim().min(1, '請輸入班別名稱').max(20), grade: z.number().int().min(1).max(6), joinMode: z.enum(['closed', 'approval', 'auto']).default('closed') }));
  const id = createClass(u.id, b.name, b.grade, b.joinMode);
  audit({ actorId: u.id, action: 'class.create', target: id });
  return ok({ id });
});
