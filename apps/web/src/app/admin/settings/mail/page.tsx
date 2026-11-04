import { pageUser } from '@/lib/pageAuth';
import { MailSettings } from './MailSettings';

export const dynamic = 'force-dynamic';
export const metadata = { title: '郵件服務' };

export default async function MailSettingsPage() {
  await pageUser(['admin']);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">郵件服務</h1>
        <p className="mt-1 text-ink-soft">用 Resend 發送驗證碼、找回密碼和廣播郵件。</p>
      </header>
      <MailSettings />
    </div>
  );
}
