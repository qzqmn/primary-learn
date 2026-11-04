import { NextResponse } from 'next/server';
import { api, isSecureRequest } from '@/lib/http';
import { COOKIE_NAME, destroySession, getCurrentUser } from '@/lib/session';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const POST = api(async (req) => {
  const user = await getCurrentUser();
  if (user) {
    destroySession(user.sessionId);
    audit({ actorId: user.id, action: 'logout' });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: isSecureRequest(req) });
  return res;
});
