import { describe, expect, it } from 'vitest';
import { checkPassword, checkUsername, isValidEmail } from '../validators';
import { decrypt, encrypt, hmac, normalizeCode, randomDigits, randomGroups } from '../crypto';
import { hashPassword, verifyPassword } from '../password';
import { codeMail } from '../mail/templates';

describe('validators', () => {
  it('accepts normal usernames and rejects bad ones', () => {
    expect(checkUsername('chan.tai-man_01')).toBeNull();
    expect(checkUsername('ab')).not.toBeNull();
    expect(checkUsername('Has Space')).not.toBeNull();
    expect(checkUsername('admin')).not.toBeNull();
    expect(checkUsername('admin', true)).toBeNull();
  });
  it('validates email', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
  });
  it('enforces role-based password length', () => {
    expect(checkPassword('abc123XYZ', 'admin')).not.toBeNull();
    expect(checkPassword('correct-horse-9', 'admin')).toBeNull();
    expect(checkPassword('abcdef', 'student')).toBeNull();
    expect(checkPassword('mypassword-chan', 'admin', { username: 'chan' })).not.toBeNull();
  });
});

describe('crypto', () => {
  it('encrypts and decrypts round trip, with random IV', () => {
    const a = encrypt('re_secret_key');
    expect(decrypt(a)).toBe('re_secret_key');
    expect(encrypt('re_secret_key')).not.toBe(a);
  });
  it('hmac is purpose-bound', () => {
    expect(hmac('otp', 'x')).not.toBe(hmac('recovery', 'x'));
  });
  it('generates codes in the expected shape', () => {
    expect(randomDigits(6)).toMatch(/^\d{6}$/);
    expect(randomGroups(3, 4)).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(normalizeCode('ab12-cd34 ')).toBe('AB12CD34');
  });
});

describe('password hashing', () => {
  it('verifies correct and rejects wrong passwords', async () => {
    const h = await hashPassword('correct-horse-9');
    expect(h.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(h, 'correct-horse-9')).toBe(true);
    expect(await verifyPassword(h, 'wrong')).toBe(false);
    expect(await verifyPassword('not-a-hash', 'x')).toBe(false);
  });
});

describe('mail templates', () => {
  it('escapes the organisation name in HTML', () => {
    const m = codeMail({ org: '<script>x</script>', purpose: 'reset_password', code: '123456', minutes: 10 });
    expect(m.html).not.toContain('<script>');
    expect(m.subject).toContain('123456');
  });
});
