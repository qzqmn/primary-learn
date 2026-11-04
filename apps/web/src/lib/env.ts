import path from 'node:path';

/** 資料目錄（SQLite、自動生成的密鑰都放這裡）。Docker 內為 /data。 */
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || './data');
