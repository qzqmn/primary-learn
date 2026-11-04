#!/usr/bin/env node
// 伺服器端維護工具（需要能進入容器，所以天然安全）
//   docker compose exec app cli reset-admin [用戶名或電郵]
//   docker compose exec app cli list-admins
//   docker compose exec app cli setup-token
import Database from 'better-sqlite3';
import { hash } from '@node-rs/argon2';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.env.DATA_DIR || './data');
const dbPath = path.join(dataDir, 'app.db');
const [cmd, arg] = process.argv.slice(2);

if (!fs.existsSync(dbPath)) {
  console.error(`找不到資料庫：${dbPath}\n請先啟動應用一次，或檢查 DATA_DIR。`);
  process.exit(1);
}
const db = new Database(dbPath);
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

const admins = () => db.prepare("SELECT id, username, email, status FROM users WHERE role = 'admin' ORDER BY created_at").all();

function tempPassword() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 16; i++) s += alphabet[crypto.randomInt(0, alphabet.length)];
  return s;
}

switch (cmd) {
  case 'list-admins': {
    const rows = admins();
    if (!rows.length) console.log('尚未建立管理員。請在瀏覽器打開網站完成首次設定。');
    for (const a of rows) console.log(`${a.username}\t${a.email ?? '-'}\t${a.status}`);
    break;
  }
  case 'setup-token': {
    if (admins().length) {
      console.log('管理員已建立，設定碼已失效。');
      break;
    }
    const row = db.prepare("SELECT value FROM settings WHERE key = 'setup_token'").get();
    console.log(process.env.SETUP_TOKEN || row?.value || '（沒有設定碼：可能已設 SETUP_REQUIRE_TOKEN=false）');
    break;
  }
  case 'reset-admin': {
    const rows = admins();
    if (!rows.length) {
      console.error('尚未建立管理員。請在瀏覽器打開網站完成首次設定。');
      process.exit(1);
    }
    let target = rows[0];
    if (arg) {
      const k = arg.toLowerCase();
      target = rows.find((a) => a.username === k || a.email === k);
      if (!target) {
        console.error(`找不到管理員「${arg}」。現有管理員：${rows.map((a) => a.username).join(', ')}`);
        process.exit(1);
      }
    } else if (rows.length > 1) {
      console.error(`有 ${rows.length} 位管理員，請指定：cli reset-admin <用戶名或電郵>\n現有：${rows.map((a) => a.username).join(', ')}`);
      process.exit(1);
    }
    const pw = tempPassword();
    const passwordHash = await hash(pw, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    db.transaction(() => {
      db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, status = 'active' WHERE id = ?").run(passwordHash, target.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id);
      db.prepare('DELETE FROM rate_limits').run();
      db.prepare("INSERT INTO audit_logs (ts, actor_id, action, target, meta) VALUES (?, NULL, 'cli.reset_admin', ?, NULL)").run(Date.now(), target.id);
    })();
    console.log(`已重設管理員「${target.username}」的密碼。\n臨時密碼：${pw}\n登入後系統會要求立即更改密碼。`);
    break;
  }
  default:
    console.log('用法：cli <reset-admin [用戶名或電郵] | list-admins | setup-token>');
    process.exit(cmd ? 1 : 0);
}
