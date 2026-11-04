import { redirect } from 'next/navigation';
import { isSetupComplete } from '@/lib/setup';
import { isMailReady } from '@/lib/mail';
import { getSetting } from '@/lib/settings';
import { AuthShell, Alert } from '@/components/ui';
import { RegisterForm } from './RegisterForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: '註冊' };

export default function RegisterPage() {
  if (!isSetupComplete()) redirect('/setup');
  if (!isMailReady())
    return (
      <AuthShell title="暫時不能註冊">
        <Alert kind="info">系統尚未啟用電郵驗證，請聯絡管理員為你建立帳號。</Alert>
      </AuthShell>
    );
  const teacherOpen = (getSetting('teacher_signup') ?? 'approval') !== 'closed';
  const parentOpen = getSetting('parent_signup') !== 'off';
  return <RegisterForm teacherOpen={teacherOpen} parentOpen={parentOpen} teacherAuto={(getSetting('teacher_signup') ?? 'approval') === 'auto'} />;
}
