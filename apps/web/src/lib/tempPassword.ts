import crypto from 'node:crypto';

/** 12 位隨機臨時密碼（無易混淆字元）＋ 符號與數字，保證通過員工密碼規則 */
export function tempPassword(): string {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const pick = (s: string) => s[crypto.randomInt(s.length)];
  const chars = Array.from({ length: 9 }, () => pick(a)).concat([pick('23456789'), pick('23456789'), pick('!#$%')]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
