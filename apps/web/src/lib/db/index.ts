import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';
import { DATA_DIR } from '../env';

export type DB = BetterSQLite3Database<typeof schema>;
type Handle = { db: DB; sqlite: Database.Database };

// 以 globalThis 保存單例，避免開發模式熱重載重複開啟連線
const g = globalThis as unknown as { __hkplDb?: Handle };

function open(): Handle {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(path.join(DATA_DIR, 'app.db'));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  const db = drizzle(sqlite, { schema });
  // 啟動時自動遷移（冪等）
  migrate(db, { migrationsFolder: process.env.MIGRATIONS_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'drizzle') });
  return { db, sqlite };
}

function handle(): Handle {
  return (g.__hkplDb ??= open());
}

export const getDb = (): DB => handle().db;
export const getSqlite = (): Database.Database => handle().sqlite;

/** 關閉並清除連線（還原備份時用）。Node 是單執行緒且 better-sqlite3 為同步 API，關閉的瞬間不會有進行中的查詢。 */
export function closeDb() {
  const h = g.__hkplDb;
  if (h) {
    try {
      h.sqlite.close();
    } catch {
      /* 已關閉 */
    }
  }
  g.__hkplDb = undefined;
}
