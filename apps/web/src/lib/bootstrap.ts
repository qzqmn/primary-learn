import { lt } from 'drizzle-orm';
import { getDb, getSqlite } from './db';
import fs from 'node:fs';
import path from 'node:path';
import { bindCodes, emailOtps, pendingRegistrations, rateLimits, sessions } from './db/schema';
import { DATA_DIR } from './env';
import { drainEmailQueue } from './broadcast';
import { loadCatalog } from './content/registry';
import { pruneExtraBackups } from './backup';
import { ensureSetupToken, isSetupComplete } from './setup';

/** 資料目錄不能寫入時，立刻以清楚的訊息結束，而不是啟動後對每個請求回 500。 */
function assertDataDirUsable() {
  const uid = typeof process.getuid === 'function' ? process.getuid() : '?';
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    const db = path.join(DATA_DIR, 'app.db');
    if (fs.existsSync(db)) fs.accessSync(db, fs.constants.R_OK | fs.constants.W_OK);
  } catch (e) {
    let owner = '?';
    try {
      owner = String(fs.statSync(DATA_DIR).uid);
    } catch {
      /* 目錄不存在 */
    }
    console.error(
      [
        '',
        '============================================================',
        ` 錯誤：資料目錄 ${DATA_DIR} 無法讀寫，系統無法啟動`,
        `   目前用戶 uid=${uid}，目錄擁有者 uid=${owner}（${e instanceof Error ? e.message : e}）`,
        ' 處理方法（任選一種）：',
        '   • 在宿主機執行：chown -R 1000:1000 <掛載到 /data 的資料夾或 volume>',
        '   • 使用官方鏡像的預設啟動方式（不要設定 user:），入口腳本會自動修正權限',
        '============================================================',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }
}

function cleanup() {
  const now = Date.now();
  const db = getDb();
  db.delete(sessions).where(lt(sessions.expiresAt, now)).run();
  db.delete(emailOtps).where(lt(emailOtps.expiresAt, now - 24 * 3600_000)).run();
  db.delete(rateLimits).where(lt(rateLimits.resetAt, now)).run();
  db.delete(pendingRegistrations).where(lt(pendingRegistrations.createdAt, now - 2 * 3600_000)).run();
  db.delete(bindCodes).where(lt(bindCodes.expiresAt, now - 30 * 86_400_000)).run();
}

const hkDay = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hong_Kong' }).format(new Date());
const KEEP_BACKUPS = 7;

/** 每日備份：用 SQLite 的線上備份 API（資料一致，不需停機），保留最近 7 份 */
async function dailyBackup() {
  const dir = path.join(DATA_DIR, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `app-${hkDay()}.db`);
  if (fs.existsSync(file)) return;
  try {
    await getSqlite().backup(file + '.tmp');
    fs.renameSync(file + '.tmp', file);
    const all = fs.readdirSync(dir).filter((f) => /^app-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
    for (const old of all.slice(0, Math.max(0, all.length - KEEP_BACKUPS))) fs.rmSync(path.join(dir, old), { force: true });
    pruneExtraBackups();
    console.log(`[backup] ${path.basename(file)} 已建立`);
  } catch (e) {
    console.error('[backup] 失敗', e);
    fs.rmSync(file + '.tmp', { force: true });
  }
}

/** 由 instrumentation 在伺服器啟動時呼叫一次 */
export async function bootstrap() {
  assertDataDirUsable();
  getDb(); // 開庫並自動遷移
  const token = ensureSetupToken();
  if (token) {
    const line = '='.repeat(58);
    console.log(`\n${line}\n  學童通 首次啟動：請用瀏覽器打開網站，完成管理員設定\n  設定碼 (Setup code)：${token}\n  （設定完成後此碼自動失效；可用 SETUP_TOKEN 自訂，\n   或設 SETUP_REQUIRE_TOKEN=false 關閉此保護）\n${line}\n`);
  } else if (!isSetupComplete()) {
    console.log('[setup] 尚未建立管理員，且 SETUP_REQUIRE_TOKEN=false：請盡快打開網站完成設定。');
  }
  cleanup();
  const cat = loadCatalog();
  console.log(`[content] 已載入 ${cat.units.length} 個練習單元${cat.errors.length ? `（${cat.errors.length} 個內容包有錯誤，已跳過）` : ''}`);
  for (const [fn, ms] of [[cleanup, 3600_000], [() => void drainEmailQueue().catch((e) => console.error('[mail-queue]', e)), 10_000], [() => void dailyBackup(), 1800_000]] as const) {
    const t = setInterval(fn, ms);
    t.unref?.();
  }
  void dailyBackup();
}
