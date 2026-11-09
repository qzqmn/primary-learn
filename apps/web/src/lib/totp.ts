import crypto from 'node:crypto';

/** RFC 6238 / RFC 4226 TOTP：base32 解碼、HMAC-SHA1、動態截斷、6 位數、30 秒步階、±1 步容錯。 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_STEP_SEC = 30;
export const TOTP_DIGITS = 6;
const WINDOW = 1;

/** 產生 20 位元組（160 bit）隨機密鑰，轉成無填充的 base32 字串 */
export function generateSecret(): string {
  const buf = crypto.randomBytes(20);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** 解碼 base32（忽略大小寫、空白與 '=' 填充），失敗回傳空 Buffer */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return Buffer.alloc(0);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** HOTP：把 8 位元組計數器做 HMAC-SHA1，動態截斷後取 6 位數 */
export function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  if (!key.length) throw new Error('TOTP 密鑰格式不正確');
  const msg = Buffer.alloc(8);
  // JS 位元運算只支援 32 bit；counter 用無號數拆成高低兩半寫入
  msg.writeUInt32BE(Math.floor(counter / 0x100000000) >>> 0, 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const mac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const binary = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

/** 指定 epoch 毫秒的 TOTP */
export function totpAt(secret: string, atMs: number = Date.now()): string {
  return hotp(secret, Math.floor(atMs / 1000 / TOTP_STEP_SEC));
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** 驗證 6 位數；接受目前、前一個、後一個步階（容忍時鐘誤差），使用固定時間比較 */
export function verifyTotp(secret: string, token: string, atMs: number = Date.now()): boolean {
  const code = token.replace(/\D/g, '');
  if (code.length !== TOTP_DIGITS) return false;
  const step = Math.floor(atMs / 1000 / TOTP_STEP_SEC);
  for (let d = -WINDOW; d <= WINDOW; d++) {
    if (safeEqual(hotp(secret, step + d), code)) return true;
  }
  return false;
}

/** 供 Google Authenticator、Authy、1Password 等掃描的 otpauth:// URI */
export function otpauthUrl(secret: string, account: string, issuer = '學童通'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const q = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SEC),
  });
  return `otpauth://totp/${label}?${q.toString()}`;
}
