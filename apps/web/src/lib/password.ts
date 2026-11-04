import { hash, verify } from '@node-rs/argon2';

// Argon2id，參數取 OWASP 建議的最低配置之一（19 MiB / t=2 / p=1），對小型 VPS 友善
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const hashPassword = (pw: string) => hash(pw, OPTS);

export async function verifyPassword(hashed: string, pw: string): Promise<boolean> {
  try {
    return await verify(hashed, pw);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | null = null;
/** 查無此人時也做一次等量的哈希運算，避免用耗時差異探測帳號是否存在 */
export function dummyHash(): Promise<string> {
  return (dummy ??= hashPassword('dummy-password-for-timing'));
}
