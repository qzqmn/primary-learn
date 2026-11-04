'use client';

import { useState } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { Card } from '@/components/kit';
import { send } from '@/lib/client';

type S = { orgName: string; teacherSignup: 'closed' | 'approval' | 'auto'; teacherDomains: string; parentSignup: boolean };

export function SettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await send('/api/admin/settings', s, 'PATCH');
    setBusy(false);
    setMsg({ ok: r.ok, t: r.ok ? '已儲存' : (r.data.error ?? '儲存失敗') });
  }
  return (
    <form onSubmit={save}>
      <Card title="機構與註冊">
        <div className="space-y-4">
          <Field label="機構名稱" value={s.orgName} onChange={(e) => setS({ ...s, orgName: e.target.value })} maxLength={40} required />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">老師註冊方式</span>
            <select value={s.teacherSignup} onChange={(e) => setS({ ...s, teacherSignup: e.target.value as S['teacherSignup'] })} className="w-full rounded-lg border-2 border-line bg-white px-3 py-2.5 text-base">
              <option value="approval">開放註冊，電郵驗證後由管理員批准（建議）</option>
              <option value="auto">開放註冊，電郵驗證後自動通過</option>
              <option value="closed">關閉：老師只由管理員建立</option>
            </select>
            <span className="mt-1 block text-xs text-ink-soft">自行註冊需要先啟用郵件服務。</span>
          </label>
          <Field label="自動通過的電郵域名（可不填）" value={s.teacherDomains} onChange={(e) => setS({ ...s, teacherDomains: e.target.value })} placeholder="school.edu.hk, example.org" hint="這些域名的老師驗證電郵後直接通過，其他人仍須批准。以逗號分隔。" />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={s.parentSignup} onChange={(e) => setS({ ...s, parentSignup: e.target.checked })} className="size-5" />
            <span className="font-semibold">開放家長註冊（需要老師給的綁定碼才能看到孩子）</span>
          </label>
          {msg && <Alert kind={msg.ok ? 'ok' : 'error'}>{msg.t}</Alert>}
          <Button type="submit" disabled={busy}>儲存設定</Button>
        </div>
      </Card>
    </form>
  );
}
