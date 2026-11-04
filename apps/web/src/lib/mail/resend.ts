export class MailError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

type Payload = { from: string; to: string; subject: string; html: string; text: string; replyTo?: string };

/** Resend REST API（不依賴 SDK，少一個依賴） */
export async function resendSend(apiKey: string, p: Payload): Promise<{ id: string | null }> {
  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'hk-primary-learn/0.1',
      },
      body: JSON.stringify({ from: p.from, to: [p.to], subject: p.subject, html: p.html, text: p.text, reply_to: p.replyTo }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new MailError('無法連線到 Resend（請檢查伺服器能否連到 api.resend.com）');
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw new MailError(data.message || `Resend 回應錯誤（HTTP ${res.status}）`, res.status);
  return { id: data.id ?? null };
}
