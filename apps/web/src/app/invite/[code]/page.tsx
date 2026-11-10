import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { invites, users } from '@/lib/db/schema';
import { randomToken, sha256 } from '@/lib/crypto';
import { hashPassword } from '@/lib/password';
import { checkPassword, checkUsername, isValidEmail, minPasswordLength, normalizeEmail, normalizeUsername } from '@/lib/validators';
import { audit } from '@/lib/audit';
import { Alert, AuthShell, Button, Field } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: '使用邀請連結註冊' };

const formSchema = z.object({
  code: z.string().min(1).max(200),
  username: z.string().trim().min(1, '請輸入用戶名').max(30),
  displayName: z.string().trim().min(1, '請輸入姓名或稱呼').max(30),
  email: z.string().trim().max(254),
  password: z.string().min(1, '請輸入密碼').max(128),
});

function findInvite(code: string) {
  if (!code) return null;
  return getDb().select().from(invites).where(eq(invites.codeHash, sha256(code))).get() ?? null;
}

const stillValid = (row: { expiresAt: number; maxUses: number; uses: number } | null, now: number) =>
  !!row && row.expiresAt > now && row.uses < row.maxUses;

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const row = findInvite(code);
  const valid = stillValid(row, Date.now());
  const role = row?.role ?? 'teacher';
  const roleLabel = role === 'parent' ? '家長' : '老師';

  async function register(formData: FormData) {
    'use server';
    const fail = (message: string) => redirect(`/invite/${encodeURIComponent(code)}?err=${encodeURIComponent(message)}`);
    const parsed = formSchema.safeParse({
      code: String(formData.get('code') ?? ''),
      username: String(formData.get('username') ?? ''),
      displayName: String(formData.get('displayName') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '輸入資料不正確');
    const b = parsed.data;

    // 每次送出都重新驗證邀請，避免連結在填表期間過期或用罄仍被使用
    const inv = findInvite(b.code);
    const now = Date.now();
    if (!stillValid(inv, now)) return fail('邀請連結無效、已過期或已用罄，請向管理員索取新的連結');
    const active = inv!;

    const username = normalizeUsername(b.username);
    const email = b.email ? normalizeEmail(b.email) : '';
    const ue = checkUsername(username);
    if (ue) return fail(ue);
    if (email && !isValidEmail(email)) return fail('電郵格式不正確');
    const pe = checkPassword(b.password, active.role, { username, email });
    if (pe) return fail(pe);

    const db = getDb();
    if (db.select({ id: users.id }).from(users).where(eq(users.username, username)).get()) return fail('此用戶名已被使用，請換一個');
    if (email && db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) return fail('此電郵已被使用，請換一個');

    const passwordHash = await hashPassword(b.password);
    const userId = randomToken(16);
    try {
      db.transaction((tx) => {
        // 以條件式原子更新占用一次名額，避免並發請求同時讀到同一個 uses 而超用 maxUses
        const bump = tx
          .update(invites)
          .set({ uses: sql`${invites.uses} + 1` })
          .where(and(eq(invites.id, active.id), lt(invites.uses, active.maxUses), gt(invites.expiresAt, now)))
          .run();
        if (!bump.changes) throw new Error('INVITE_EXHAUSTED');
        tx.insert(users)
          .values({
            id: userId,
            username,
            email: email || null,
            displayName: b.displayName,
            role: active.role,
            passwordHash,
            status: 'active',
            mustChangePassword: false,
            emailVerifiedAt: email ? now : null,
            createdAt: now,
          })
          .run();
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'INVITE_EXHAUSTED') {
        return fail('邀請連結無效、已過期或已用罄，請向管理員索取新的連結');
      }
      throw e;
    }
    audit({ actorId: active.createdBy, action: 'invite.redeemed', target: userId, meta: { inviteId: active.id, role: active.role } });
    redirect('/login?registered=1');
  }

  return (
    <AuthShell title="使用邀請連結註冊" subtitle={valid ? `此連結用於建立${roleLabel}帳號，有效期 7 天` : undefined}>
      {!valid ? (
        <Alert>此邀請連結無效、已過期或已用罄，請向管理員索取新的連結。</Alert>
      ) : (
        <div className="space-y-4">
          {sp.err && <Alert>{sp.err}</Alert>}
          <form action={register} className="space-y-4">
            <input type="hidden" name="code" value={code} />
            <Field label="用戶名" name="username" autoComplete="username" autoCapitalize="none" maxLength={30} required />
            <Field label="姓名／稱呼" name="displayName" autoComplete="name" maxLength={30} required />
            <Field label="電郵（可不填）" name="email" type="email" autoComplete="email" maxLength={254} />
            <Field label="密碼" name="password" type="password" autoComplete="new-password" minLength={minPasswordLength(role)} maxLength={128} required />
            <p className="text-xs text-ink-soft">密碼至少 {minPasswordLength(role)} 個字元，不可包含用戶名或電郵帳號，也不可使用常見密碼。</p>
            <Button type="submit" className="w-full">建立{roleLabel}帳號</Button>
          </form>
          <p className="text-center text-sm">
            <Link href="/login" className="font-semibold text-ballpoint underline underline-offset-2">返回登入</Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
