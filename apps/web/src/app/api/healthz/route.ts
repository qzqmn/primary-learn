import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    getSqlite().prepare('SELECT 1').get();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
