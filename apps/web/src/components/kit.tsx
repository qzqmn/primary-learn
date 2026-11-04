import type { ReactNode } from 'react';

export const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`);
export const hk = (ms: number | null | undefined, withTime = true) =>
  ms ? new Date(ms).toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', month: 'numeric', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) }) : '—';
export const ago = (ms: number | null) => {
  if (!ms) return '從未';
  const d = Math.floor((Date.now() - ms) / 86_400_000);
  return d <= 0 ? '今日' : d === 1 ? '昨日' : `${d} 日前`;
};

export function Card({ title, children, className = '', action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-xl border-2 border-line bg-white p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border-2 border-line bg-white p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Stars({ n, size = 'text-lg' }: { n: number; size?: string }) {
  return (
    <span className={size} role="img" aria-label={`${n} 顆星，滿分 3 顆`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? 'text-[#e8a900]' : 'text-line'} aria-hidden>
          ★
        </span>
      ))}
    </span>
  );
}

/** 正確率色條（文字同時標示，不單靠顏色） */
export function Bar({ value }: { value: number | null }) {
  const v = value ?? 0;
  const color = v >= 0.8 ? 'bg-ok' : v >= 0.6 ? 'bg-[#e8a900]' : 'bg-pen';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-paper" aria-hidden>
        <div className={`h-full ${color}`} style={{ width: `${Math.round(v * 100)}%` }} />
      </div>
      <span className="w-10 text-right text-sm tabular-nums">{pct(value)}</span>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-line text-ink-soft">
            {head.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-2 [&_td]:py-2 [&_tr]:border-b [&_tr]:border-line/60">{children}</tbody>
      </table>
    </div>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-lg bg-paper px-3 py-4 text-center text-sm text-ink-soft">{children}</p>;
