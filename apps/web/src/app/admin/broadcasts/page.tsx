import { desc, eq } from 'drizzle-orm';
import { pageUser } from '@/lib/pageAuth';
import { classesOf } from '@/lib/classes';
import { getDb } from '@/lib/db';
import { broadcasts } from '@/lib/db/schema';
import { broadcastStats } from '@/lib/broadcast';
import { isMailReady } from '@/lib/mail';
import { Card, Empty, hk } from '@/components/kit';
import { Compose } from './Compose';

export const dynamic = 'force-dynamic';
export const metadata = { title: '廣播通知' };

export default async function BroadcastPage() {
  const me = await pageUser(['admin', 'teacher']);
  const cls = classesOf(me.id, me.role).filter((c) => !c.archived).map((c) => ({ id: c.id, name: `${c.name}（P${c.grade}）` }));
  const q = getDb().select().from(broadcasts);
  const rows = (me.role === 'admin' ? q : q.where(eq(broadcasts.createdBy, me.id))).orderBy(desc(broadcasts.createdAt)).limit(30).all();
  return (
    <>
      <h1 className="text-2xl font-bold">廣播通知</h1>
      <Card title="發送新通知">
        <Compose role={me.role as 'admin' | 'teacher'} classes={cls} mailReady={isMailReady()} />
      </Card>
      <Card title="已發送">
        {rows.length === 0 ? (
          <Empty>還沒有發送過通知。</Empty>
        ) : (
          <ul className="space-y-3">
            {rows.map((b) => {
              const st = broadcastStats(b.id);
              return (
                <li key={b.id} className="rounded-lg border-2 border-line p-3">
                  <p className="font-semibold">{b.pinned && '📌 '}{b.title}</p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-ink-soft">{b.body}</p>
                  <p className="mt-2 text-xs text-ink-soft">
                    {hk(b.createdAt)} · 收件人 {st.total} · 已讀 {st.read}
                    {b.sendEmail && ` · 電郵：已發 ${st.mails.sent ?? 0}、排隊 ${st.mails.pending ?? 0}、失敗 ${st.mails.failed ?? 0}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
