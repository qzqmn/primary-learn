import { notFound } from 'next/navigation';
import { isSetupComplete, setupTokenRequired } from '@/lib/setup';
import { SetupWizard } from './SetupWizard';

export const dynamic = 'force-dynamic';
export const metadata = { title: '首次設定' };

export default function SetupPage() {
  if (isSetupComplete()) notFound(); // 設定完成後此頁永久關閉
  return <SetupWizard requireToken={setupTokenRequired()} />;
}
