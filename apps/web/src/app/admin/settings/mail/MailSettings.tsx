'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { send } from '@/lib/client';

type Cfg = {
  configured: boolean;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  dailyLimit: number;
  hasApiKey: boolean;
  apiKeySource: 'db' | 'env' | null;
  enabled: boolean;
  verifiedAt: number | null;
  sentLast24h: number;
};

type Templates = {
  verifySubject: string;
  verifyBody: string;
  broadcastSubject: string;
  broadcastBody: string;
};

const EMPTY_TEMPLATES: Templates = { verifySubject: '', verifyBody: '', broadcastSubject: '', broadcastBody: '' };

function TextArea({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full rounded-lg border-2 border-line bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-ballpoint"
      />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function MailSettings() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [f, setF] = useState({ apiKey: '', fromName: '', fromEmail: '', replyTo: '', dailyLimit: '100' });
  const [tpl, setTpl] = useState<Templates>(EMPTY_TEMPLATES);
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const r = await send('/api/admin/mail', undefined, 'GET');
    if (!r.ok) return setMsg({ kind: 'error', text: r.data.error ?? '載入失敗' });
    const c: Cfg = r.data.config;
    setCfg(c);
    setF({ apiKey: '', fromName: c.fromName, fromEmail: c.fromEmail, replyTo: c.replyTo, dailyLimit: String(c.dailyLimit) });
    if (r.data.templates) setTpl(r.data.templates as Templates);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const setT = (k: keyof Templates) => (v: string) => setTpl({ ...tpl, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy('save');
    const r = await send(
      '/api/admin/mail',
      { apiKey: f.apiKey || undefined, fromName: f.fromName, fromEmail: f.fromEmail, replyTo: f.replyTo || undefined, dailyLimit: Number(f.dailyLimit) },
      'PUT',
    );
    setBusy('');
    if (!r.ok) return setMsg({ kind: 'error', text: r.data.error ?? '儲存失敗' });
    setMsg({ kind: 'ok', text: '已儲存。請按「發送測試郵件」確認設定可用。' });
    await load();
  }

  async function saveTemplates(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy('templates');
    const r = await send('/api/admin/mail', tpl, 'PATCH');
    setBusy('');
    if (!r.ok) return setMsg({ kind: 'error', text: r.data.error ?? '儲存失敗' });
    setMsg({ kind: 'ok', text: '郵件模板已儲存。' });
    await load();
  }

  async function test() {
    setMsg(null);
    setBusy('test');
    const r = await send('/api/admin/mail/test');
    setBusy('');
    if (!r.ok) return setMsg({ kind: 'error', text: r.data.error ?? '測試失敗' });
    setMsg({ kind: 'ok', text: `測試郵件已發到 ${r.data.sentTo}，郵件服務已啟用。` });
    await load();
  }

  async function toggle(enabled: boolean) {
    setMsg(null);
    setBusy('toggle');
    const r = await send('/api/admin/mail/toggle', { enabled });
    setBusy('');
    if (!r.ok) return setMsg({ kind: 'error', text: r.data.error ?? '操作失敗' });
    await load();
  }

  if (!cfg) return <p className="text-ink-soft">載入中…</p>;

  const status = cfg.enabled && cfg.verifiedAt ? { t: '運作中', c: 'bg-ok-tint text-ok' } : cfg.configured ? { t: '未啟用（需測試）', c: 'bg-hi/60' } : { t: '未設定', c: 'bg-paper border border-line' };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-full px-3 py-1 font-semibold ${status.c}`}>{status.t}</span>
        <span className="text-ink-soft">過去 24 小時已發送 {cfg.sentLast24h} 封</span>
      </div>

      <Alert kind="info">
        使用自己的域名發信前，須先在 Resend 後台驗證域名（加入 SPF／DKIM 記錄）；未驗證域名時，Resend 只允許發到你自己的帳號郵箱。費用與免費額度以 Resend 官網為準。
      </Alert>

      <form onSubmit={save} className="space-y-4 rounded-xl border-2 border-line bg-white p-5">
        <Field
          label="Resend API Key"
          type="password"
          value={f.apiKey}
          onChange={set('apiKey')}
          autoComplete="off"
          placeholder={cfg.hasApiKey ? `已設定（來源：${cfg.apiKeySource === 'env' ? '環境變數' : '資料庫，已加密'}）；留空表示不更改` : 're_...'}
          hint="儲存後不會再顯示，只在伺服器端加密保存"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="發件人名稱" value={f.fromName} onChange={set('fromName')} placeholder="學童通" maxLength={60} />
          <Field label="發件地址" type="email" value={f.fromEmail} onChange={set('fromEmail')} placeholder="no-reply@你的域名.com" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="回覆地址（可留空）" type="email" value={f.replyTo} onChange={set('replyTo')} />
          <Field label="每日發送上限" type="number" min={1} value={f.dailyLimit} onChange={set('dailyLimit')} hint="防止被濫用而耗盡額度" required />
        </div>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={!!busy}>
            {busy === 'save' ? '儲存中…' : '儲存設定'}
          </Button>
          <Button type="button" variant="ghost" onClick={test} disabled={!!busy || !cfg.configured}>
            {busy === 'test' ? '發送中…' : '發送測試郵件'}
          </Button>
          {cfg.enabled && (
            <Button type="button" variant="danger" onClick={() => toggle(false)} disabled={!!busy}>
              停用郵件服務
            </Button>
          )}
          {!cfg.enabled && cfg.verifiedAt && (
            <Button type="button" variant="ghost" onClick={() => toggle(true)} disabled={!!busy}>
              重新啟用
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-soft">測試郵件只會發到你自己的管理員電郵。</p>
      </form>

      <form onSubmit={saveTemplates} className="space-y-4 rounded-xl border-2 border-line bg-white p-5">
        <div>
          <h2 className="text-lg font-bold">郵件模板</h2>
          <p className="mt-1 text-sm text-ink-soft">編輯驗證信（註冊、驗證電郵、重設密碼）與廣播信的標題和內容。</p>
        </div>
        <Alert kind="info">
          可用佔位符：<b className="font-mono">{'{{code}}'}</b> 驗證碼、<b className="font-mono">{'{{name}}'}</b> 收件人姓名／稱呼、
          <b className="font-mono">{'{{org}}'}</b> 機構名稱、<b className="font-mono">{'{{minutes}}'}</b> 驗證碼有效分鐘數；
          廣播信另有 <b className="font-mono">{'{{title}}'}</b>、<b className="font-mono">{'{{body}}'}</b>、<b className="font-mono">{'{{unsubscribeUrl}}'}</b>。
          系統會自動帶入對應內容，請勿自行改動佔位符的寫法。
        </Alert>
        <Field label="驗證信標題" value={tpl.verifySubject} onChange={(e) => setT('verifySubject')(e.target.value)} maxLength={200} required />
        <TextArea label="驗證信內容" value={tpl.verifyBody} onChange={setT('verifyBody')} hint="純文字；換行會保留。請務必保留 {{code}}，否則用戶收不到驗證碼。" />
        <Field label="廣播信標題" value={tpl.broadcastSubject} onChange={(e) => setT('broadcastSubject')(e.target.value)} maxLength={200} required />
        <TextArea label="廣播信內容" value={tpl.broadcastBody} onChange={setT('broadcastBody')} hint="純文字；{{body}} 會換成管理員撰寫的廣播內容。" />
        <Button type="submit" disabled={!!busy}>
          {busy === 'templates' ? '儲存中…' : '儲存郵件模板'}
        </Button>
      </form>
    </div>
  );
}
