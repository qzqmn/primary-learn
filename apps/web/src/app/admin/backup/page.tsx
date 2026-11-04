import { pageUser } from '@/lib/pageAuth';
import { listBackups } from '@/lib/backup';
import { Card, Empty, Table, hk } from '@/components/kit';
import { BackupTools, StoredBackupActions } from './BackupTools';

export const dynamic = 'force-dynamic';
export const metadata = { title: '備份與還原' };

const KIND = { auto: '每日自動', manual: '手動', 'pre-restore': '還原前的安全備份' } as const;
const mb = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

export default async function BackupPage() {
  await pageUser(['admin']);
  const files = listBackups();
  return (
    <>
      <h1 className="text-2xl font-bold">備份與還原</h1>
      <Card title="匯出備份">
        <p className="mb-3 text-sm text-ink-soft">備份是一個完整的資料庫檔（學生、班級、練習記錄、設定、通知、操作記錄…全部），可用來搬遷到另一台伺服器。下載時資料保持一致，不需要停機。</p>
        <BackupTools mode="export" />
      </Card>

      <Card title="伺服器上的備份">
        {files.length === 0 ? (
          <Empty>還沒有備份。系統每日自動備份一次（保留最近 7 份）。</Empty>
        ) : (
          <Table head={['檔名', '類型', '大小', '時間', '操作']}>
            {files.map((f) => (
              <tr key={f.name}>
                <td className="font-mono text-xs">{f.name}</td>
                <td>{KIND[f.kind]}</td>
                <td className="tabular-nums">{mb(f.size)}</td>
                <td className="whitespace-nowrap">{hk(f.mtime)}</td>
                <td><StoredBackupActions name={f.name} /></td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-xs text-ink-soft">這些備份和資料庫在同一個磁碟上，磁碟壞了會一起消失——請定期下載一份放到別處。</p>
      </Card>

      <Card title="匯入並還原">
        <BackupTools mode="import" />
      </Card>

      <Card title="還原前請知道">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>還原會<b>取代</b>目前所有資料。系統會先自動做一份「還原前的安全備份」；如果還原過程出錯，會自動回復。</li>
          <li>還原後所有人（包括你）都需要重新登入。</li>
          <li>備份<b>不包含</b>加密用的密鑰檔（資料目錄的 <code>secret.key</code>）。搬到新伺服器後，郵件服務的 API Key 需要重新輸入；老師的家長綁定碼和未完成的驗證碼會失效。</li>
          <li>備份可以來自較舊的版本（會自動升級），但不能來自較新的版本。</li>
        </ul>
      </Card>
    </>
  );
}
