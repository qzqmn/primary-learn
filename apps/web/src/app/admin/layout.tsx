import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getOrgName } from '@/lib/settings';
import { Brand } from '@/components/ui';
import { LogoutButton } from './LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin' && user.role !== 'teacher') redirect('/');
  if (user.mustChangePassword) redirect('/account/password');
  const isAdmin = user.role === 'admin';

  const nav = [
    { href: '/admin', label: '總覽' },
    { href: '/admin/classes', label: '班級與學生' },
    { href: '/admin/broadcasts', label: '廣播通知' },
    { href: '/admin/papers', label: '試卷' },
    ...(isAdmin
      ? [
          { href: '/admin/people', label: '老師與家長' },
          { href: '/admin/settings', label: '系統設定' },
          { href: '/admin/settings/mail', label: '郵件服務' },
          { href: '/admin/content', label: '題庫與內容包' },
          { href: '/admin/backup', label: '備份與還原' },
          { href: '/admin/audit', label: '操作記錄' },
        ]
      : []),
  ];

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="grid-paper border-b-2 border-line p-4 md:flex md:flex-col md:border-r-2 md:border-b-0">
        <Brand />
        <p className="mt-1 truncate text-sm text-ink-soft">{getOrgName()}</p>
        <nav className="mt-4 flex gap-1 overflow-x-auto md:flex-col" aria-label="管理後台">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-2 font-semibold hover:bg-ballpoint-tint">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t-2 border-line pt-3 md:mt-auto">
          <p className="truncate text-sm font-semibold">{user.displayName}</p>
          <p className="mb-2 text-xs text-ink-soft">{isAdmin ? '管理員' : '老師'}</p>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/account/password" className="text-ballpoint underline underline-offset-2">更改密碼</Link>
            <LogoutButton />
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8">{children}</main>
    </div>
  );
}
