export type ApiResult = { ok: boolean; status: number; data: Record<string, any> };

/** 前端呼叫 API 的小工具：永遠回傳 { ok, data }，錯誤訊息在 data.error */
export async function send(url: string, body?: unknown, method = 'POST'): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok !== false, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: '網絡連線失敗，請檢查網絡後再試' } };
  }
}
