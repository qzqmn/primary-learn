import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** 包裝 API：同源檢查（CSRF 第二層防線）＋統一錯誤格式 */
export function api(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json(
          { ok: false, error: e.message, code: e.code },
          { status: e.status, headers: e.status === 429 ? { 'Retry-After': '60' } : undefined },
        );
      }
      if (e instanceof ZodError) {
        return NextResponse.json({ ok: false, error: e.issues[0]?.message ?? '輸入資料不正確' }, { status: 400 });
      }
      console.error('[api]', e);
      return NextResponse.json({ ok: false, error: '伺服器發生錯誤，請稍後再試' }, { status: 500 });
    }
  };
}

export const ok = (data: Record<string, unknown> = {}, init?: ResponseInit) =>
  NextResponse.json({ ok: true, ...data }, init);

export async function readJson<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, '請求格式不正確');
  }
  return schema.parse(raw);
}

function hostOf(v: string | null): string | null {
  if (!v) return null;
  try {
    return new URL(v.includes('://') ? v : `http://${v}`).host;
  } catch {
    return null;
  }
}

/** 寫入類請求必須帶有與本站相符的 Origin（可用 APP_URL 指定對外網址） */
export function assertSameOrigin(req: NextRequest) {
  const origin = hostOf(req.headers.get('origin'));
  if (!origin) throw new HttpError(403, '請求來源不明');
  const allowed = new Set(
    [req.headers.get('host'), req.headers.get('x-forwarded-host'), process.env.APP_URL ?? null]
      .map(hostOf)
      .filter((h): h is string => !!h),
  );
  if (!allowed.has(origin)) throw new HttpError(403, '請求來源不被允許');
}

/**
 * 取得訪客 IP。預設不信任任何標頭（回傳 null，系統只做「按帳號」的限流）。
 * 部署在 Cloudflare 後設 TRUST_PROXY=cloudflare；在 Caddy/Nginx 後設 TRUST_PROXY=xff
 * （前置代理必須自行覆寫 X-Forwarded-For，不能原樣轉發客戶端傳來的值）。
 */
export function clientIp(req: NextRequest): string | null {
  const mode = process.env.TRUST_PROXY ?? 'none';
  if (mode === 'cloudflare') return req.headers.get('cf-connecting-ip');
  if (mode === 'xff' || mode === 'true') {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim() || null;
    return req.headers.get('x-real-ip');
  }
  return null;
}

export function isSecureRequest(req: NextRequest): boolean {
  const forced = process.env.COOKIE_SECURE;
  if (forced === 'true') return true;
  if (forced === 'false') return false;
  return req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
}
