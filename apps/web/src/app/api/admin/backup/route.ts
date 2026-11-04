import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { api, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getSqlite } from '@/lib/db';
import { backupPath } from '@/lib/backup';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const headers = (name: string) => ({ 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' });

/**
 * 下載備份。不帶參數＝即時產生一份完整資料庫快照（SQLite 線上備份，資料一致，不需停機）；
 * ?name=… ＝下載伺服器上已有的備份（檔名白名單，防止路徑穿越）。
 */
export const GET = api(async (req) => {
  const admin = await requireUser(['admin']);
  const name = new URL(req.url).searchParams.get('name');
  if (name) {
    const p = backupPath(name);
    if (!p || !fs.existsSync(p)) throw new HttpError(404, '找不到此備份');
    audit({ actorId: admin.id, action: 'backup.download', target: name });
    return new Response(new Uint8Array(fs.readFileSync(p)), { headers: headers(name) });
  }
  const tmp = path.join(os.tmpdir(), `hkpl-${Date.now()}.db`);
  await getSqlite().backup(tmp);
  const buf = fs.readFileSync(tmp);
  fs.rmSync(tmp, { force: true });
  audit({ actorId: admin.id, action: 'backup.download', target: 'live' });
  return new Response(new Uint8Array(buf), { headers: headers(`hkpl-backup-${new Date().toISOString().slice(0, 10)}.db`) });
});
