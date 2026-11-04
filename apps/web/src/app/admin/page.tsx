import Link from 'next/link';
import { pageUser } from '@/lib/pageAuth';
import { isMailReady, readConfig } from '@/lib/mail';
import { VerifyEmailCard } from './VerifyEmailCard';
import { classesOf } from '@/lib/classes';
import { systemOverview, teacherOverview } from '@/lib/stats';
import { noticesFor } from '@/lib/broadcast';
import { Notices } from '@/components/Notices';
import { Stat, pct } from '@/components/kit';

export const dynamic = 'force-dynamic';
export const metadata = { title: '總覽' };

function Step({ done, title, children }: { done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border-2 border-line bg-white p-4">
      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-ok text-white' : 'bg-hi text-ink'}`} aria-hidden>
        {done ? '✓' : '!'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {title}
          <span className="sr-only">{done ? '（已完成）' : '（未完成）'}</span>
        </p>
        <div className="mt-1 text-sm text-ink-soft">{children}</div>
      </div>
    </li>
  );
}

export default async function AdminHome() {
  const user = await pageUser(['admin', 'teacher']);
  const notices = <Notices items={noticesFor(user.id).filter((n) => !n.readAt)} />;

  if (user.role === 'teacher') {
    const cls = classesOf(user.id, 'teacher').filter((c) => !c.archived);
    const o = teacherOverview(cls.map((c) => c.id));
    return (
      <div className="space-y-6">
        {notices}
        <header>
          <h1 className="text-2xl font-bold">你好，{user.displayName}</h1>
          <p className="mt-1 text-ink-soft">{cls.length ? `你有 ${cls.length} 個班級。` : '先建立一個班級，再加入學生。'}</p>
        </header>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="學生人數" value={o.students} />
          <Stat label="今日有練習" value={o.activeToday} hint="過去 24 小時" />
          <Stat label="本週有練習" value={o.activeWeek} />
          <Stat label="本週正確率" value={pct(o.accuracyWeek)} hint={`${o.answersWeek} 題`} />
        </div>
        <Link href="/admin/classes" className="inline-block rounded-lg bg-ballpoint px-4 py-2.5 font-semibold text-white">前往班級與學生</Link>
      </div>
    );
  }

  const mailReady = isMailReady();
  const mailConfigured = !!readConfig();
  const o = systemOverview();
  return (
    <div className="space-y-8">
      {notices}
      <header>
        <h1 className="text-2xl font-bold">管理後台</h1>
        <p className="mt-1 text-ink-soft">全校概況（過去 7 日）。</p>
      </header>

      {o.pendingTeachers > 0 && (
        <Link href="/admin/people" className="block rounded-xl border-2 border-hi bg-hi/40 p-4 font-semibold">
          有 {o.pendingTeachers} 位老師等待批准 →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="學生" value={o.students} />
        <Stat label="老師" value={o.teachers} />
        <Stat label="家長" value={o.parents} />
        <Stat label="班級" value={o.classes} />
        <Stat label="今日有練習" value={o.activeToday} hint="過去 24 小時" />
        <Stat label="本週有練習" value={o.activeWeek} />
        <Stat label="本週作答題數" value={o.answersWeek} />
        <Stat label="本週正確率" value={pct(o.accuracyWeek)} />
      </div>

      {(!mailReady || !user.emailVerified) && (
        <ul className="space-y-3">
          <Step done={mailReady} title="設定郵件服務（Resend）">
            {mailReady ? (
              <>郵件服務運作中。</>
            ) : (
              <>
                用來發送註冊驗證碼、找回密碼和廣播郵件。
                <br />
                <Link href="/admin/settings/mail" className="font-semibold text-ballpoint underline underline-offset-2">
                  {mailConfigured ? '繼續完成設定' : '前往設定'}
                </Link>
              </>
            )}
          </Step>
          <Step done={user.emailVerified} title="驗證你的管理員電郵">
            {user.emailVerified ? (
              <>已驗證，忘記密碼時可用電郵驗證碼重設。</>
            ) : mailReady ? (
              <VerifyEmailCard email={user.email ?? ''} />
            ) : (
              <>需要先完成上一項。在此之前，忘記密碼只能用恢復碼。</>
            )}
          </Step>
        </ul>
      )}
    </div>
  );
}
