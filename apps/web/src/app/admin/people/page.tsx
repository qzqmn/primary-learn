import { pageUser } from '@/lib/pageAuth';
import { desc, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { Card, Empty, Table, hk } from '@/components/kit';
import { InviteTools, NewTeacher, PersonActions } from './PeopleTools';

export const dynamic = 'force-dynamic';
export const metadata = { title: '老師與家長' };

const STATUS = { active: '使用中', pending: '待批准', disabled: '已停用' } as const;

export default async function PeoplePage() {
  await pageUser(['admin']);
  const rows = getDb().select().from(users).where(inArray(users.role, ['teacher', 'parent'])).orderBy(desc(users.createdAt)).all();
  rows.sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'));
  return (
    <>
      <h1 className="text-2xl font-bold">老師與家長</h1>
      <Card title="建立老師帳號"><NewTeacher /></Card>
      <Card title="邀請連結"><InviteTools /></Card>
      <Card title="帳號列表">
        {rows.length === 0 ? (
          <Empty>還沒有老師或家長帳號。</Empty>
        ) : (
          <Table head={['姓名', '身份', '用戶名', '電郵', '狀態', '註冊', '操作']}>
            {rows.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="font-semibold">{u.displayName}</td>
                <td>{u.role === 'teacher' ? '老師' : '家長'}</td>
                <td className="font-mono text-xs">{u.username}</td>
                <td className="text-xs">{u.email ?? '—'}{u.email && !u.emailVerifiedAt && '（未驗證）'}</td>
                <td><span className={`rounded px-1.5 py-0.5 text-xs ${u.status === 'pending' ? 'bg-hi' : u.status === 'disabled' ? 'bg-paper text-ink-soft' : 'bg-ok-tint'}`}>{STATUS[u.status]}</span></td>
                <td className="whitespace-nowrap">{hk(u.createdAt, false)}</td>
                <td className="min-w-44"><PersonActions id={u.id} status={u.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
