import { z } from 'zod';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { readConfig, writeConfig } from '@/lib/mail';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const POST = api(async (req) => {
  const me = await requireUser(['admin']);
  const { enabled } = await readJson(req, z.object({ enabled: z.boolean() }));
  const cfg = readConfig();
  if (!cfg) throw new HttpError(400, '請先儲存郵件設定');
  if (enabled && !cfg.verifiedAt) throw new HttpError(400, '請先發送測試郵件並成功後，才能啟用');
  writeConfig({ ...cfg, enabled });
  audit({ actorId: me.id, action: enabled ? 'mail.enabled' : 'mail.disabled' });
  return ok();
});
