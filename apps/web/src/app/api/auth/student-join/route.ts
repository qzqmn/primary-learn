import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, clientIp, HttpError, ok, readJson } from '@/lib/http';
import { assertRate } from '@/lib/ratelimit';
import { getDb } from '@/lib/db';
import { classes } from '@/lib/db/schema';
import { createStudent, normalizeClassCode } from '@/lib/classes';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const body = z.object({ classCode: z.string().trim().min(1).max(20), nickname: z.string().trim().min(1).max(30), password: z.string().min(6, '密碼至少 6 個字元').max(128) });

/** 學生用班級代碼自助加入（班級須由老師開放；可設為需老師批准） */
export const POST = api(async (req) => {
  const { classCode, nickname, password } = await readJson(req, body);
  const ip = clientIp(req);
  if (ip) assertRate(`sjoin:ip:${ip}`, 15, 3600);
  const code = normalizeClassCode(classCode);
  assertRate(`sjoin:class:${code}`, 60, 3600, '這個班級今日申請太多，請聯絡老師');
  const cls = getDb().select().from(classes).where(eq(classes.joinCode, code)).get();
  if (!cls || cls.archived || cls.joinMode === 'closed') throw new HttpError(403, '這個班級暫時不開放自助加入，請向老師索取登入卡');
  const s = await createStudent(cls.id, nickname, { password, status: cls.joinMode === 'approval' ? 'pending' : 'active' });
  audit({ actorId: s.id, action: 'student.self_join', target: cls.id, ip });
  return ok({ pending: cls.joinMode === 'approval' });
});
