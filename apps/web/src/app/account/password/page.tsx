import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { PasswordForm } from './PasswordForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: '更改密碼' };

export default async function PasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <PasswordForm forced={user.mustChangePassword} />;
}
