import { pageUser } from '@/lib/pageAuth';
import { getOrgName, getSetting } from '@/lib/settings';
import { loadCatalog } from '@/lib/content/registry';
import { Card } from '@/components/kit';
import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: '系統設定' };

export default async function SettingsPage() {
  await pageUser(['admin']);
  const cat = loadCatalog();
  return (
    <>
      <h1 className="text-2xl font-bold">系統設定</h1>
      <SettingsForm
        initial={{
          orgName: getOrgName(),
          teacherSignup: (getSetting('teacher_signup') ?? 'approval') as 'closed' | 'approval' | 'auto',
          teacherDomains: (getSetting('teacher_domains') ?? '').split(',').filter(Boolean).join(', '),
          parentSignup: getSetting('parent_signup') !== 'off',
        }}
      />
      <Card title="備份與遷移">
        <p className="mb-3 text-sm text-ink-soft">每日自動備份、手動下載、匯入還原（含搬遷到另一台伺服器）都在「備份與還原」。</p>
        <a href="/admin/backup" className="inline-block rounded-lg border-2 border-line bg-white px-4 py-2 font-semibold hover:border-ballpoint">前往備份與還原</a>
      </Card>
      <Card title="內容包">
        <p className="text-sm">已載入 {cat.units.length} 個練習單元。把內容包 JSON 放進伺服器的內容目錄後重啟即可載入。</p>
        {cat.errors.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-pen">{cat.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        )}
      </Card>
    </>
  );
}
