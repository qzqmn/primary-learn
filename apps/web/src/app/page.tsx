import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { isSetupComplete } from '@/lib/setup';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!isSetupComplete()) redirect('/setup');
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword) redirect('/account/password');
  redirect(user.role === 'student' ? '/learn' : user.role === 'parent' ? '/parent' : '/admin');
}
