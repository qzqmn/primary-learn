'use client';

import { useState } from 'react';
import { send } from '@/lib/client';

type Notice = { id: string; title: string; body: string; pinned: boolean; createdAt: number; readAt: number | null };

/** 站內通知：未讀的顯示在最上；按「知道了」標為已讀 */
export function Notices({ items }: { items: Notice[] }) {
  const [list, setList] = useState(items);
  const unread = list.filter((n) => !n.readAt);
  if (!list.length) return null;
  async function read(ids: string[]) {
    setList((l) => l.map((n) => (ids.includes(n.id) ? { ...n, readAt: Date.now() } : n)));
    await send('/api/notices/read', { ids });
  }
  const shown = unread.length ? unread : [];
  if (!shown.length) return null;
  return (
    <section aria-label="通知" className="space-y-2">
      {shown.slice(0, 3).map((n) => (
        <div key={n.id} className="rounded-xl border-2 border-ballpoint bg-ballpoint-tint p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold">{n.pinned && '📌 '}{n.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
            </div>
            <button onClick={() => read([n.id])} className="shrink-0 rounded-lg border-2 border-ballpoint bg-white px-3 py-1.5 text-sm font-semibold hover:bg-ballpoint-tint">
              知道了
            </button>
          </div>
        </div>
      ))}
      {shown.length > 3 && <p className="text-sm text-ink-soft">還有 {shown.length - 3} 則未讀通知</p>}
    </section>
  );
}
