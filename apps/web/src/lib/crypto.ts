import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './env';

let secretCache: Buffer | null = null;

/**
 * 應用密鑰：優先用環境變數 SESSION_SECRET；
 * 沒設定時自動生成並存到資料目錄（/data/secret.key，權限 600），部署者無需手動配置。
 */
export function getSecret(): Buffer {
  if (secretCache) return secretCache;
  let raw = process.env.SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) {
    const file = path.join(DATA_DIR, 'secret.key');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(file)) {
      raw = fs.readFileSync(file, 'utf8').trim();
    } else {
      raw = crypto.randomBytes(48).toString('base64url');
      fs.writeFileSync(file, raw, { mode: 0o600 });
    }
  }
  secretCache = crypto.createHash('sha256').update(raw).digest();
  return secretCache;
}

/** 帶用途前綴的 HMAC，用於驗證碼、恢復碼的儲存 */
export function hmac(purpose: string, value: string): string {
  return crypto.createHmac('sha256', getSecret()).update(`${purpose}\0${value}`).digest('hex');
}

export const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function aesKey(): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', getSecret(), Buffer.alloc(0), 'hkpl-secrets-v1', 32));
}

/** AES-256-GCM：用於加密後台填寫的 API Key */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', aesKey(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', aesKey(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export function randomDigits(n = 6): string {
  let s = '';
  for (let i = 0; i < n; i++) s += crypto.randomInt(0, 10);
  return s;
}

// 去掉容易混淆的字元（0/O、1/I/L）
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function randomGroups(groups: number, size: number): string {
  const out: string[] = [];
  for (let g = 0; g < groups; g++) {
    let part = '';
    for (let i = 0; i < size; i++) part += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
    out.push(part);
  }
  return out.join('-');
}

export const normalizeCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
