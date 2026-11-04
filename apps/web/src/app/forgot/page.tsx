import { redirect } from 'next/navigation';
import { isMailReady } from '@/lib/mail';
import { isSetupComplete } from '@/lib/setup';
import { ForgotForm } from './ForgotForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: '忘記密碼' };

export default function ForgotPage() {
  if (!isSetupComplete()) redirect('/setup');
  return <ForgotForm mailReady={isMailReady()} />;
}
