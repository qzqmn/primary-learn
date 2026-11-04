import fs from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { api, HttpError, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { assertRate } from '@/lib/ratelimit';
import { backupPath, discardStaged, MAX_UPLOAD_BYTES, stageFile, stagePath } from '@/lib/backup';

export const dynamic = 'force-dynamic';

/**
 * 第一步：選擇要還原的備份並驗證（此時還不會改動任何現有資料）。
 *  - Content-Type: application/json   { name }  → 使用伺服器上已有的備份
 *  - Content-Type: application/octet-stream     → 上傳的 .db 檔
 */
export const POST = api(async (req) => {
  const admin = await requireUser(['admin']);
  assertRate(`restore-stage:${admin.id}`, 20, 3600, '操作太頻繁，請稍後再試');
  const type = req.headers.get('content-type') ?? '';
  let label = '';
  if (type.includes('application/json')) {
    const { name } = (await req.json()) as { name?: string };
    const p = name ? backupPath(name) : null;
    if (!p || !fs.existsSync(p)) throw new HttpError(404, '找不到此備份');
    label = name!;
    const r = stageFile(p, label);
    if (!r.ok) throw new HttpError(400, r.error);
    return ok({ source: label, info: r.info });
  }
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_UPLOAD_BYTES) throw new HttpError(413, `檔案太大（上限 ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB）`);
  if (!req.body) throw new HttpError(400, '沒有收到檔案');
  discardStaged();
  const tmp = stagePath() + '.upload';
  let bytes = 0;
  try {
    const src = Readable.fromWeb(req.body as never);
    src.on('data', (c: Buffer) => {
      bytes += c.length;
      if (bytes > MAX_UPLOAD_BYTES) src.destroy(new HttpError(413, '檔案太大'));
    });
    await pipeline(src, fs.createWriteStream(tmp, { mode: 0o600 }));
    label = `上傳（${Math.round(bytes / 1024)} KB）`;
    const r = stageFile(tmp, label);
    if (!r.ok) throw new HttpError(400, r.error);
    return ok({ source: label, info: r.info });
  } finally {
    for (const ext of ['', '-wal', '-shm']) fs.rmSync(tmp + ext, { force: true });
  }
});
