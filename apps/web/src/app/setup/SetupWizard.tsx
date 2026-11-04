'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AuthShell, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

const ZONES = [
  ['Asia/Hong_Kong', '香港 (UTC+8)'],
  ['Asia/Macau', '澳門 (UTC+8)'],
  ['Asia/Singapore', '新加坡 (UTC+8)'],
  ['Asia/Taipei', '台北 (UTC+8)'],
  ['UTC', 'UTC'],
];

export function SetupWizard({ requireToken }: { requireToken: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState({ setupToken: '', orgName: '', timezone: 'Asia/Hong_Kong', username: '', email: '', password: '', password2: '' });
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function next1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!f.orgName.trim()) return setError('請輸入機構名稱');
    if (requireToken) {
      setBusy(true);
      const r = await send('/api/setup/verify-token', { token: f.setupToken });
      setBusy(false);
      if (!r.ok) return setError(r.data.error ?? '設定碼不正確');
    }
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (f.password !== f.password2) return setError('兩次輸入的密碼不一致');
    setBusy(true);
    const r = await send('/api/setup', {
      setupToken: f.setupToken,
      orgName: f.orgName,
      timezone: f.timezone,
      username: f.username,
      email: f.email,
      password: f.password,
    });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? '設定失敗');
    setCodes(r.data.recoveryCodes);
    setStep(3);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
    } catch {
      setError('無法自動複製，請手動抄下恢復碼');
    }
  }

  const titles = ['歡迎使用學童通', '建立管理員帳號', '保存你的恢復碼'];

  return (
    <AuthShell title={titles[step - 1]} subtitle={`首次設定 · 第 ${step} 步，共 3 步`}>
      {step === 1 && (
        <form onSubmit={next1} className="space-y-4">
          {requireToken && (
            <Field
              label="設定碼"
              value={f.setupToken}
              onChange={set('setupToken')}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              hint="在伺服器執行 docker compose logs app，找到「設定碼」一行"
              required
            />
          )}
          <Field label="機構名稱" value={f.orgName} onChange={set('orgName')} placeholder="例如：陳老師補習班" maxLength={60} required />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">時區</span>
            <select value={f.timezone} onChange={set('timezone')} className="w-full rounded-lg border-2 border-line bg-white px-3 py-2.5 text-base focus:border-ballpoint">
              {ZONES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={busy} className="w-full">
            下一步
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="space-y-4">
          <Field label="用戶名" value={f.username} onChange={set('username')} autoComplete="username" hint="日常登入用，3–20 個字元，小寫英文、數字、. _ -" required />
          <Field label="電郵" type="email" value={f.email} onChange={set('email')} autoComplete="email" hint="用於找回密碼，不用於登入時輸入" required />
          <Field label="密碼" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" hint="至少 10 個字元" required />
          <Field label="確認密碼" type="password" value={f.password2} onChange={set('password2')} autoComplete="new-password" required />
          {error && <Alert>{error}</Alert>}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              上一步
            </Button>
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? '建立中…' : '建立管理員'}
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Alert kind="info">
            這 8 組恢復碼<strong>只會顯示這一次</strong>。每組可使用一次；當郵件服務不可用而你忘記密碼時，可用它重設管理員密碼。
          </Alert>
          <ul className="grid grid-cols-2 gap-2 rounded-lg border-2 border-line bg-white p-3 font-mono text-[15px]">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Button type="button" variant="ghost" onClick={copy} className="w-full">
            {copied ? '已複製' : '複製全部'}
          </Button>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-1 size-4" />
            <span>我已把恢復碼存放在安全的地方（例如密碼管理器）</span>
          </label>
          {error && <Alert>{error}</Alert>}
          <Button
            className="w-full"
            disabled={!saved}
            onClick={() => {
              router.push('/admin');
              router.refresh();
            }}
          >
            進入管理後台
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
