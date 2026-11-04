import { api, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { createManualBackup, pruneExtraBackups } from '@/lib/backup';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
/** 立即在伺服器上建立一份備份（保留在 backups/，與每日自動備份分開，最多保留 10 份） */
export const POST = api(async () => {
  const admin = await requireUser(['admin']);
  const name = await createManualBackup();
  pruneExtraBackups();
  audit({ actorId: admin.id, action: 'backup.create', target: name });
  return ok({ name });
});
