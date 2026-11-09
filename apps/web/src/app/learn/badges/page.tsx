import Link from 'next/link';
import { pageUser } from '@/lib/pageAuth';
import { BADGE_DEFS, earnedBadges } from '@/lib/badges';
import { Empty, hk } from '@/components/kit';

export const dynamic = 'force-dynamic';
export const metadata = { title: '我的徽章' };

export default async function BadgesPage() {
  const me = await pageUser(['student']);
  const earned = earnedBadges(me.id);
  const got = BADGE_DEFS.filter((b) => earned.has(b.code)).length;

  return (
    <>
      <Link href="/learn" className="text-sm font-semibold text-ballpoint underline underline-offset-2">
        ← 返回
      </Link>

      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">我的徽章</h1>
        <p className="text-sm text-ink-soft">
          已獲得 {got} / {BADGE_DEFS.length}
        </p>
      </div>
      <p className="text-sm text-ink-soft">每次完成練習後，系統會自動檢查並頒發達成的徽章。</p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {BADGE_DEFS.map((b) => {
          const at = earned.get(b.code);
          return (
            <li
              key={b.code}
              className={`rounded-xl border-2 p-4 ${at ? 'border-ok bg-ok-tint' : 'border-line bg-white'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{b.name}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{b.desc}</p>
                  <p className="mt-1 text-xs text-ink-soft">達成條件：{b.hint}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${at ? 'bg-ok text-white' : 'bg-paper text-ink-soft'}`}
                >
                  {at ? '已獲得' : '未獲得'}
                </span>
              </div>
              {at && <p className="mt-2 text-xs text-ink-soft">獲得時間：{hk(at, false)}</p>}
            </li>
          );
        })}
      </ul>

      {got === 0 && <Empty>還沒有徽章，完成一次練習就會開始累積。</Empty>}
    </>
  );
}
