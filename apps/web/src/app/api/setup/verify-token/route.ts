import { z } from 'zod';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { assertRate } from '@/lib/ratelimit';
import { checkSetupToken, isSetupComplete } from '@/lib/setup';

export const dynamic = 'force-dynamic';

export const POST = api(async (req) => {
  if (isSetupComplete()) throw new HttpError(404, 'Not found');
  assertRate('setup:token', 10, 900, '嘗試次數過多，請 15 分鐘後再試');
  const { token } = await readJson(req, z.object({ token: z.string().max(64).optional() }));
  if (!checkSetupToken(token)) throw new HttpError(400, '設定碼不正確。請在伺服器執行 docker compose logs app 查看');
  return ok();
});
