import { findUnit } from '@/lib/content/registry';
import { studentSummary } from '@/lib/stats';
import { Bar, Card, Empty, Stat, Table, ago, hk, pct } from '@/components/kit';

const KIND = { practice: '自由練習', assignment: '功課', redo: '錯題重做' } as Record<string, string>;

/** 老師與家長共用的學生學習報告（資料由呼叫端先做權限檢查） */
export function StudentReport({ studentId, name }: { studentId: string; name: string }) {
  const s = studentSummary(studentId);
  const weak = s.tags.filter((t) => t.n >= 3).slice(0, 8);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="總作答題數" value={s.answered} hint={`約 ${s.minutes} 分鐘`} />
        <Stat label="整體正確率" value={pct(s.accuracy)} />
        <Stat label="近 7 日" value={s.weekAnswered} hint={`正確率 ${pct(s.weekAccuracy)}`} />
        <Stat label="連續練習" value={`${s.streak} 日`} hint={`最後練習：${ago(s.lastActive)}`} />
      </div>

      <Card title="知識點掌握（由弱到強）">
        {weak.length === 0 ? (
          <Empty>{name}的作答還不夠多（每個知識點至少 3 題）才能分析弱項。</Empty>
        ) : (
          <Table head={['知識點', '單元', '作答', '正確率']}>
            {weak.map((t) => (
              <tr key={t.tag + t.unitId}>
                <td className="font-mono text-xs">{t.tag}</td>
                <td>{findUnit(t.unitId)?.title ?? t.unitId}</td>
                <td className="tabular-nums">{t.n}</td>
                <td><Bar value={t.c / t.n} /></td>
              </tr>
            ))}
          </Table>
        )}
        {s.openMistakes > 0 && <p className="mt-3 text-sm">錯題本內有 <b>{s.openMistakes}</b> 題未掌握。</p>}
      </Card>

      <Card title="最近練習">
        {s.recent.length === 0 ? (
          <Empty>還沒有練習記錄。</Empty>
        ) : (
          <Table head={['時間', '類型', '單元', '成績']}>
            {s.recent.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{hk(r.startedAt)}</td>
                <td>{KIND[r.kind] ?? r.kind}</td>
                <td>{findUnit(r.unitId)?.title ?? r.unitId}</td>
                <td className="tabular-nums">{r.finishedAt ? `${r.correct} / ${r.total}` : '未完成'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
