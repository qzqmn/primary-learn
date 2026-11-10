'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { Card } from '@/components/kit';
import { send } from '@/lib/client';

type S = { orgName: string; teacherSignup: 'closed' | 'approval' | 'auto'; teacherDomains: string; parentSignup: boolean };
type Preview = { attempts: number; attemptAnswers: number; emailLogs: number; auditLogs: number; total: number; enabled: boolean };

export function SettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [retDays, setRetDays] = useState('365');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [retMsg, setRetMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [retBusy, setRetBusy] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await send('/api/admin/settings', s, 'PATCH');
    setBusy(false);
    setMsg({ ok: r.ok, t: r.ok ? '已儲存' : (r.data.error ?? '儲存失敗') });
  }

  const loadRetention = useCallback(async () => {
    const r = await send('/api/admin/retention', undefined, 'GET');
    if (!r.ok) return;
    setRetDays(String(r.data.days ?? 365));
    setPreview((r.data.preview as Preview) ?? null);
  }, []);
  useEffect(() => {
    void loadRetention();
  }, [loadRetention]);

  async function retention(execute: boolean) {
    if (execute && !confirm('確定立即清理過期資料？此動作無法復原。')) return;
    setRetMsg(null);
    setRetBusy(execute ? 'run' : 'save');
    const r = await send('/api/admin/retention', { days: Number(retDays), execute }, 'POST');
    setRetBusy('');
    if (!r.ok) return setRetMsg({ ok: false, t: r.data.error ?? '操作失敗' });
    const deleted = r.data.result?.deleted?.total as number | undefined;
    setRetMsg({ ok: true, t: execute ? `清理完成，共刪除 ${deleted ?? 0} 筆資料。` : '已儲存保留天數。' });
    await loadRetention();
  }

  return (
    <>
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

      <Card title="資料保留">
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            只會清理過期的練習紀錄、作答紀錄、郵件記錄與操作記錄；用戶帳號、錯題本與內容包題庫都會保留。
          </p>
          <Field
            label="資料保留天數"
            type="number"
            min={0}
            max={3650}
            value={retDays}
            onChange={(e) => setRetDays(e.target.value)}
            hint="預設 365 天；填 0 表示不自動清理。系統以「練習開始時間」與「記錄時間」判斷是否過期。"
            required
          />
          {preview && (
            <Alert kind="info">
              {preview.enabled ? (
                <>
                  目前設定下可清理 {preview.total} 筆：練習紀錄 {preview.attempts} 筆、作答紀錄 {preview.attemptAnswers} 筆、郵件記錄 {preview.emailLogs} 筆、操作記錄 {preview.auditLogs} 筆。
                </>
              ) : (
                '保留天數為 0，目前不會清理任何資料。'
              )}
            </Alert>
          )}
          {retMsg && <Alert kind={retMsg.ok ? 'ok' : 'error'}>{retMsg.t}</Alert>}
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => retention(false)} disabled={!!retBusy}>
              {retBusy === 'save' ? '儲存中…' : '儲存保留天數'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => retention(true)} disabled={!!retBusy}>
              {retBusy === 'run' ? '清理中…' : '立即清理'}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="帳號安全">
        <p className="mb-3 text-sm text-ink-soft">管理員與老師可為自己的帳號啟用二步驗證，登入時須額外輸入驗證應用程式上的 6 位驗證碼。</p>
        <Link href="/account/totp" className="inline-block rounded-lg border-2 border-line bg-white px-4 py-2 font-semibold hover:border-ballpoint">前往二步驗證設定</Link>
      </Card>
    </>
  );
}
