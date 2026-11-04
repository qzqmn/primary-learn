import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { isSetupComplete } from '@/lib/setup';
import { isMailReady } from '@/lib/mail';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: '登入' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ c?: string; n?: string; t?: string }> }) {
  if (!isSetupComplete()) redirect('/setup');
  if (await getCurrentUser()) redirect('/');
  const sp = await searchParams;
  return <LoginForm initialTab={sp.t === 'staff' ? 'staff' : sp.c || sp.t === 'student' ? 'student' : 'staff'} classCode={sp.c?.slice(0, 20) ?? ''} nickname={sp.n?.slice(0, 30) ?? ''} canRegister={isMailReady()} />;
}
