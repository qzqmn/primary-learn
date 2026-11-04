const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(org: string, heading: string, inner: string) {
  return `<!doctype html><html lang="zh-HK"><body style="margin:0;background:#eef1f8;font-family:-apple-system,'PingFang HK','Microsoft JhengHei',sans-serif;color:#14213d">
<div style="max-width:480px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-radius:12px;padding:28px;border-top:4px solid #2347c5">
<p style="margin:0 0 12px;font-size:13px;color:#5a6785">${esc(org)}</p>
<h1 style="margin:0 0 16px;font-size:20px">${esc(heading)}</h1>${inner}</div>
<p style="font-size:12px;color:#7a86a3;text-align:center;margin:16px 0 0">此郵件由系統自動發出，請勿直接回覆。</p>
</div></body></html>`;
}

const PURPOSE_LABEL = { reset_password: '重設密碼', verify_email: '驗證電郵', register: '註冊' } as const;

export function codeMail(o: { org: string; purpose: keyof typeof PURPOSE_LABEL; code: string; minutes: number }) {
  const label = PURPOSE_LABEL[o.purpose];
  return {
    subject: `【${o.org}】${label}驗證碼：${o.code}`,
    html: layout(
      o.org,
      `${label}驗證碼`,
      `<p style="margin:0 0 16px;font-size:15px">請在網頁輸入以下驗證碼：</p>
<p style="margin:0 0 16px;font-size:34px;letter-spacing:8px;font-weight:700;font-family:ui-monospace,Menlo,monospace">${esc(o.code)}</p>
<p style="margin:0;font-size:14px;color:#5a6785">驗證碼 ${o.minutes} 分鐘內有效。如果不是你本人操作，請忽略此郵件，帳號不會有任何變動。</p>`,
    ),
    text: `${o.org} ${label}驗證碼：${o.code}\n${o.minutes} 分鐘內有效。如果不是你本人操作，請忽略此郵件。`,
  };
}

export function passwordChangedMail(org: string) {
  return {
    subject: `【${org}】你的密碼已更改`,
    html: layout(org, '密碼已更改', `<p style="margin:0;font-size:15px">你的帳號密碼剛剛已被更改。如果不是你本人操作，請立即聯絡管理員。</p>`),
    text: `${org}：你的帳號密碼剛剛已被更改。如果不是你本人操作，請立即聯絡管理員。`,
  };
}

export function testMail(org: string) {
  return {
    subject: `【${org}】郵件服務測試`,
    html: layout(org, '郵件服務設定成功', `<p style="margin:0;font-size:15px">收到這封郵件，代表系統已可以經 Resend 正常發信。</p>`),
    text: `${org}：郵件服務設定成功。`,
  };
}

/** 廣播郵件：正文只做換行與跳脫，不支援 HTML；附退訂連結（系統驗證碼郵件不受退訂影響） */
export function broadcastMail(o: { org: string; title: string; body: string; unsubscribeUrl: string }) {
  const paras = o.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return {
    subject: `【${o.org}】${o.title}`,
    html: layout(o.org, o.title, paras + `<p style="margin:18px 0 0;font-size:12px;color:#7a86a3">不想再收到此類通知？<a href="${esc(o.unsubscribeUrl)}">按此退訂</a>（驗證碼等系統郵件不受影響）。</p>`),
    text: `${o.org}\n${o.title}\n\n${o.body}\n\n退訂：${o.unsubscribeUrl}`,
  };
}
