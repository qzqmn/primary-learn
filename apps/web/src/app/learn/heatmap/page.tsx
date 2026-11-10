import Link from 'next/link';
import { pageUser } from '@/lib/pageAuth';
import { heatmapData } from '@/lib/stats';
import { SUBJECT_LABEL, type Subject } from '@/lib/content/types';
import { Bar, Card, Table, pct } from '@/components/kit';

export const dynamic = 'force-dynamic';
export const metadata = { title: '學習熱圖' };

const SUBJECTS: Subject[] = ['math', 'english', 'chinese', 'general'];
const GRADES = [1, 2, 3, 4, 5, 6];
const key = (s: Subject, g: number) => `${s}:${g}`;

/** 色塊只作輔助，正確率一律以文字百分比標示 */
function tone(v: number | null) {
  if (v == null) return 'bg-paper text-ink-soft';
  if (v >= 0.8) return 'bg-ok-tint text-ink';
  if (v >= 0.6) return 'bg-hi text-ink';
  return 'bg-pen-tint text-ink';
}

export default async function HeatmapPage() {
  const me = await pageUser(['student']);
  const cells = heatmapData(me.id);

  return (
    <>
      <Link href="/learn" className="text-sm font-semibold text-ballpoint underline underline-offset-2">← 返回我的學習</Link>
      <div>
        <h1 className="text-2xl font-bold">學習熱圖</h1>
        <p className="mt-1 text-sm text-ink-soft">4 科 × P1–P6：每格顯示該格所有單元的累計作答數與正確率。色塊只作輔助，正確率一律以文字標示。</p>
      </div>

      <Card title="作答數與正確率">
        <Table head={['科目 / 年級', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']}>
          {SUBJECTS.map((s) => (
            <tr key={s}>
              <th scope="row" className="whitespace-nowrap px-2 py-2 text-left font-semibold">{SUBJECT_LABEL[s]}</th>
              {GRADES.map((g) => {
                const c = cells.get(key(s, g))!;
                return (
                  <td key={g} className="p-1">
                    <div className={`min-w-[5.5rem] rounded-lg p-2 text-center ${tone(c.accuracy)}`}>
                      <p className="text-sm font-bold tabular-nums">{c.answered} 題</p>
                      <p className="text-xs font-semibold tabular-nums">正確 {pct(c.accuracy)}</p>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </Table>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-ok-tint" />正確率 ≥ 80%</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-hi" />60–79%</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-pen-tint" />&lt; 60%</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-paper" />未作答</span>
        </div>
      </Card>

      <Card title="各科整體正確率（累計）">
        <Table head={['科目', '作答', '正確率']}>
          {SUBJECTS.map((s) => {
            let answered = 0;
            let correct = 0;
            for (const g of GRADES) {
              const c = cells.get(key(s, g))!;
              answered += c.answered;
              correct += c.correct;
            }
            const accuracy = answered ? correct / answered : null;
            return (
              <tr key={s}>
                <td className="font-semibold">{SUBJECT_LABEL[s]}</td>
                <td className="tabular-nums">{answered} 題</td>
                <td><Bar value={accuracy} /></td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-2 text-xs text-ink-soft">正確率以文字百分比顯示，色條只作輔助；沒有作答時顯示「—」。</p>
      </Card>
    </>
  );
}
