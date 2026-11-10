import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getOrgName } from '@/lib/settings';
import { getServerT } from '@/lib/serverI18n';
import { LogoutButton } from '../admin/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect('/');
  if (user.mustChangePassword) redirect('/account/password');
  const t = await getServerT();
  return (
    <div className="min-h-dvh">
      <header className="grid-paper border-b-2 border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/learn" className="text-lg font-bold">{getOrgName()}</Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/learn/mistakes" className="font-semibold text-ballpoint underline underline-offset-2">{t('nav.mistakes')}</Link>
            <span className="font-semibold">{user.displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">{children}</main>
    </div>
  );
}
