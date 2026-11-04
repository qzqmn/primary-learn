import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { closeDb, getDb, getSqlite } from './db';
import { DATA_DIR } from './env';
import { HttpError } from './http';
import { audit } from './audit';
import { reloadCatalog } from './content/registry';

export const BACKUP_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, 'backups');
const STAGE = path.join(/*turbopackIgnore: true*/ DATA_DIR, 'restore-staged.db');
const STAGE_META = path.join(/*turbopackIgnore: true*/ DATA_DIR, 'restore-staged.json');
const STAGE_TTL_MS = 30 * 60_000;
export const MAX_UPLOAD_BYTES = Number(process.env.BACKUP_MAX_MB || 512) * 1024 * 1024;
/** 允許下載／還原的備份檔名（防止路徑穿越）：每日自動、手動、還原前的安全備份 */
export const BACKUP_NAME_RE = /^(app-\d{4}-\d{2}-\d{2}|manual-\d{8}-\d{6}|pre-restore-\d{8}-\d{6})\.db$/;

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

export type BackupFile = { name: string; size: number; mtime: number; kind: 'auto' | 'manual' | 'pre-restore' };

export function listBackups(): BackupFile[] {
  try {
    return fs
      .readdirSync(/*turbopackIgnore: true*/ BACKUP_DIR)
      .filter((n) => BACKUP_NAME_RE.test(n))
      .map((name) => {
        const st = fs.statSync(path.join(/*turbopackIgnore: true*/ BACKUP_DIR, name));
        return { name, size: st.size, mtime: st.mtimeMs, kind: name.startsWith('app-') ? 'auto' : name.startsWith('manual-') ? 'manual' : 'pre-restore' } as BackupFile;
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

export function backupPath(name: string): string | null {
  return BACKUP_NAME_RE.test(name) ? path.join(/*turbopackIgnore: true*/ BACKUP_DIR, name) : null;
}

export async function createManualBackup(): Promise<string> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `manual-${stamp()}.db`;
  await getSqlite().backup(path.join(/*turbopackIgnore: true*/ BACKUP_DIR, name));
  return name;
}

/** 手動備份與還原前備份各只保留最新 10 份，避免無限增長（每日自動備份另有 7 份輪替） */
export function pruneExtraBackups() {
  for (const kind of ['manual', 'pre-restore'] as const) {
    for (const old of listBackups().filter((b) => b.kind === kind).slice(10)) fs.rmSync(path.join(/*turbopackIgnore: true*/ BACKUP_DIR, old.name), { force: true });
  }
}

export type BackupInfo = {
  migrations: number;
  admins: number;
  teachers: number;
  parents: number;
  students: number;
  classes: number;
  answers: number;
  lastActivity: number | null;
};

const journalCount = (): number => {
  const dir = process.env.MIGRATIONS_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'drizzle');
  return (JSON.parse(fs.readFileSync(path.join(/*turbopackIgnore: true*/ dir, 'meta', '_journal.json'), 'utf8')) as { entries: unknown[] }).entries.length;
};

/**
 * 驗證一個 SQLite 檔是否可安全還原。不信任上傳的檔案：
 * 檔頭、完整性檢查、只允許本系統已知的資料表、不允許觸發器／檢視表、必須有管理員、不可來自較新版本。
 */
export function inspectBackup(file: string): { ok: true; info: BackupInfo } | { ok: false; error: string } {
  try {
    const fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(16);
    fs.readSync(fd, head, 0, 16, 0);
    fs.closeSync(fd);
    if (head.toString('latin1') !== 'SQLite format 3\u0000') return { ok: false, error: '這不是有效的備份檔（不是 SQLite 資料庫）' };
  } catch {
    return { ok: false, error: '無法讀取檔案' };
  }
  let db: Database.Database | null = null;
  try {
    db = new Database(file, { readonly: true, fileMustExist: true });
    const integrity = db.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') return { ok: false, error: '備份檔已損壞（完整性檢查未通過）' };
    const objs = db.prepare("select type, name from sqlite_master where name not like 'sqlite_%'").all() as { type: string; name: string }[];
    if (objs.some((o) => o.type === 'trigger' || o.type === 'view')) return { ok: false, error: '備份檔含有不明的觸發器或檢視表，已拒絕' };
    const known = new Set((getSqlite().prepare("select name from sqlite_master where name not like 'sqlite_%'").all() as { name: string }[]).map((r) => r.name));
    const unknown = objs.filter((o) => !known.has(o.name));
    if (unknown.length) return { ok: false, error: `備份檔含有本系統不認識的資料表：${unknown[0].name}` };
    if (!objs.some((o) => o.name === 'users') || !objs.some((o) => o.name === '__drizzle_migrations')) return { ok: false, error: '這不是本系統的備份檔' };
    const migrations = (db.prepare('select count(*) n from __drizzle_migrations').get() as { n: number }).n;
    if (migrations > journalCount()) return { ok: false, error: '這份備份來自較新版本的系統，請先升級系統再還原' };
    const has = (t: string) => objs.some((o) => o.name === t);
    const n = (sql: string, ...p: unknown[]) => Number((db!.prepare(sql).get(...p) as { n: number | null } | undefined)?.n ?? 0);
    const role = (r: string) => n("select count(*) n from users where role = ? and status != 'disabled'", r);
    const admins = n("select count(*) n from users where role = 'admin' and status = 'active'");
    if (admins < 1) return { ok: false, error: '備份內沒有可用的管理員帳號，還原後將無法登入，已拒絕' };
    return {
      ok: true,
      info: {
        migrations,
        admins,
        teachers: role('teacher'),
        parents: role('parent'),
        students: role('student'),
        classes: has('classes') ? n('select count(*) n from classes') : 0,
        answers: has('attempt_answers') ? n('select count(*) n from attempt_answers') : 0,
        lastActivity: has('attempt_answers') ? (db.prepare('select max(ts) m from attempt_answers').get() as { m: number | null }).m : null,
      },
    };
  } catch (e) {
    return { ok: false, error: `無法讀取備份檔：${e instanceof Error ? e.message.slice(0, 120) : '未知錯誤'}` };
  } finally {
    db?.close();
    rmSidecars(file); // 唯讀開啟 WAL 模式的檔案也會留下 -wal／-shm；殘留的舊 -wal 可能被誤套用到之後的新檔案
  }
}

/** 把已驗證的檔案暫存起來，等管理員確認後才真正還原 */
export function stageFile(src: string, label: string): { ok: true; info: BackupInfo } | { ok: false; error: string } {
  const r = inspectBackup(src);
  if (!r.ok) return r;
  if (path.resolve(src) !== path.resolve(STAGE)) fs.copyFileSync(src, STAGE);
  fs.writeFileSync(STAGE_META, JSON.stringify({ stagedAt: Date.now(), label, info: r.info }));
  return r;
}
export const stagePath = () => STAGE;
/** 刪除 SQLite 在檔案旁邊產生的 -wal／-shm（只用在我們自己的暫存檔和備份檔，它們都是完整獨立的快照）。 */
const rmSidecars = (file: string) => {
  for (const ext of ['-wal', '-shm']) fs.rmSync(file + ext, { force: true });
};
export function discardStaged() {
  for (const f of [STAGE, STAGE + '.upload']) {
    fs.rmSync(f, { force: true });
    rmSidecars(f);
  }
  fs.rmSync(STAGE_META, { force: true });
}

/**
 * 真正還原：先為現有資料做一份安全備份 → 關閉連線 → 換檔 → 重新開啟並遷移 →
 * 任何一步失敗都自動換回安全備份。
 */
export async function applyStaged(): Promise<{ safety: string; info: BackupInfo }> {
  let meta: { stagedAt: number; label: string } | null = null;
  try {
    meta = JSON.parse(fs.readFileSync(STAGE_META, 'utf8'));
  } catch {
    /* 沒有暫存 */
  }
  if (!meta || !fs.existsSync(STAGE)) throw new HttpError(400, '沒有待還原的備份，請先選擇或上傳備份檔');
  if (Date.now() - meta.stagedAt > STAGE_TTL_MS) {
    discardStaged();
    throw new HttpError(400, '暫存的備份已超過 30 分鐘，請重新選擇');
  }
  const again = inspectBackup(STAGE);
  if (!again.ok) throw new HttpError(400, again.error);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const safety = `pre-restore-${stamp()}.db`;
  const safetyPath = path.join(/*turbopackIgnore: true*/ BACKUP_DIR, safety);
  await getSqlite().backup(safetyPath);

  const live = path.join(/*turbopackIgnore: true*/ DATA_DIR, 'app.db');
  const swapIn = (from: string) => {
    closeDb();
    for (const ext of ['-wal', '-shm']) fs.rmSync(live + ext, { force: true });
    fs.copyFileSync(from, live + '.restoring');
    fs.renameSync(live + '.restoring', live);
    getDb(); // 重新開啟並自動遷移到最新版本
    const ok = getSqlite().prepare("select count(*) n from users where role = 'admin'").get() as { n: number };
    if (ok.n < 1) throw new Error('還原後找不到管理員');
  };
  try {
    swapIn(STAGE);
    reloadCatalog(); // 內容包存在資料庫裏，換了資料庫就要重新載入題庫
  } catch (e) {
    swapIn(safetyPath); // 回復
    reloadCatalog();
    throw new HttpError(500, `還原失敗，已自動回復到還原前的資料。原因：${e instanceof Error ? e.message.slice(0, 160) : '未知'}`);
  }
  discardStaged();
  pruneExtraBackups();
  audit({ action: 'backup.restore', target: meta.label, meta: { safetyBackup: safety, ...again.info } });
  return { safety, info: again.info };
}
