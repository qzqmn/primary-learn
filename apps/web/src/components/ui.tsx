import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

/** 田字格：練習中文字用的方格，也是品牌標誌 */
export function TianZiGe({ char = '學', size = 120, className = '' }: { char?: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={`田字格：${char}`}>
      <rect x="2" y="2" width="96" height="96" rx="3" fill="#fff" stroke="var(--color-pen)" strokeWidth="2.5" />
      <path d="M50 2V98M2 50H98" stroke="var(--color-pen)" strokeWidth="1.2" strokeDasharray="4 4" opacity=".7" />
      <text x="50" y="76" textAnchor="middle" fontSize="70" fontWeight="800" fill="var(--color-ink)" fontFamily="var(--font-sans)">
        {char}
      </text>
    </svg>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <TianZiGe size={34} />
      <span className="text-lg font-bold tracking-tight">學童通</span>
    </div>
  );
}

export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border-2 border-line bg-white px-3 py-2.5 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-ballpoint disabled:bg-paper"
      />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-ballpoint text-white hover:bg-ballpoint-dark',
    ghost: 'border-2 border-line bg-white text-ink hover:border-ballpoint',
    danger: 'bg-pen text-white hover:opacity-90',
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'ok' | 'info'; children: ReactNode }) {
  const s = {
    error: 'border-pen bg-pen-tint',
    ok: 'border-ok bg-ok-tint',
    info: 'border-ballpoint bg-ballpoint-tint',
  }[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border-l-4 px-3 py-2 text-sm ${s}`}>
      {children}
    </div>
  );
}

/** 認證頁共用版面：左邊格仔簿＋田字格，右邊表單；手機上縮成頂部橫幅 */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="grid-paper flex items-center justify-center border-b-2 border-line px-6 py-6 lg:border-r-2 lg:border-b-0 lg:py-0">
        <div className="flex items-center gap-6 lg:flex-col lg:gap-8">
          <TianZiGe size={96} className="lg:hidden" />
          <TianZiGe size={220} className="hidden lg:block" />
          <div className="lg:text-center">
            <p className="text-2xl font-extrabold tracking-tight lg:text-4xl">學童通</p>
            <p className="mt-1 text-sm text-ink-soft lg:text-base">香港小學 P1–P6 教學與練習</p>
          </div>
        </div>
      </aside>
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}
