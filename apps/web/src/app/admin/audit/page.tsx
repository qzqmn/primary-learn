import { pageUser } from '@/lib/pageAuth';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { auditLogs, users } from '@/lib/db/schema';
import { Card, Table } from '@/components/kit';

export const dynamic = 'force-dynamic';
export const metadata = { title: '操作記錄' };

export default async function AuditPage() {
  await pageUser(['admin']);
  const db = getDb();
  const names = new Map(db.select({ id: users.id, n: users.displayName }).from(users).all().map((u) => [u.id, u.n]));
  const rows = db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(200).all();
  return (
    <>
      <h1 className="text-2xl font-bold">操作記錄</h1>
      <Card title="最近 200 筆">
        <Table head={['時間', '用戶', '動作', '對象', 'IP']}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap">{new Date(r.ts).toLocaleString('sv-SE', { timeZone: 'Asia/Hong_Kong' })}</td>
              <td>{r.actorId ? (names.get(r.actorId) ?? r.actorId.slice(0, 8)) : '—'}</td>
              <td className="font-mono text-xs">{r.action}</td>
              <td className="max-w-48 truncate font-mono text-xs">{r.target ?? ''}</td>
              <td className="font-mono text-xs">{r.ip ?? ''}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
