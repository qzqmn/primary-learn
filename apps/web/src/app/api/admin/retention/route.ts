import { z } from 'zod';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { setSetting } from '@/lib/settings';
import { getRetentionDays, MAX_RETENTION_DAYS, previewRetention, runRetention } from '@/lib/retention';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** 預覽目前（或 ?days= 指定的）保留天數下會被刪除的筆數 */
export const GET = api(async (req) => {
  await requireUser(['admin']);
  const days = getRetentionDays();
  const raw = req.nextUrl.searchParams.get('days');
  const parsed = raw === null ? null : z.coerce.number().int().min(0).max(MAX_RETENTION_DAYS).safeParse(raw);
  const previewDays = parsed?.success ? parsed.data : days;
  return ok({ days, previewDays, preview: previewRetention(previewDays) });
});

const body = z.object({
  days: z.number().int().min(0, '保留天數不可小於 0').max(MAX_RETENTION_DAYS, '保留天數過大'),
  execute: z.boolean().default(false),
});

/** 儲存保留天數；execute=true 時同時立即清理，兩者都寫入 audit */
export const POST = api(async (req) => {
  const me = await requireUser(['admin']);
  const b = await readJson(req, body);
  setSetting('retentionDays', String(b.days));
  const result = b.execute ? runRetention(b.days) : null;
  audit({ actorId: me.id, action: b.execute ? 'retention.run' : 'retention.settings_updated', meta: { days: b.days, deleted: result?.deleted ?? null } });
  return ok({ days: b.days, preview: previewRetention(b.days), result });
});
