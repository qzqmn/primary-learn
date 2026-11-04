import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { unsubscribes } from '@/lib/db/schema';
import { verifyUnsub } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const e = (req.nextUrl.searchParams.get('e') ?? '').toLowerCase();
  const t = req.nextUrl.searchParams.get('t') ?? '';
  const good = !!e && !!t && verifyUnsub(e, t);
  if (good) getDb().insert(unsubscribes).values({ email: e, createdAt: Date.now() }).onConflictDoNothing().run();
  const msg = good ? '已退訂廣播郵件。驗證碼等系統郵件不受影響，你仍可在網站內收到通知。' : '退訂連結無效。';
  return new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>退訂</title><body style="font-family:system-ui,'PingFang HK','Microsoft JhengHei',sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;line-height:1.7"><h1>${good ? '已退訂' : '無法退訂'}</h1><p>${msg}</p>`, { headers: { 'content-type': 'text/html; charset=utf-8' }, status: good ? 200 : 400 });
}
