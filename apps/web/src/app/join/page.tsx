import { redirect } from 'next/navigation';
import { isSetupComplete } from '@/lib/setup';
import { JoinForm } from './JoinForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: '加入班級' };
export default function JoinPage() {
  if (!isSetupComplete()) redirect('/setup');
  return <JoinForm />;
}
