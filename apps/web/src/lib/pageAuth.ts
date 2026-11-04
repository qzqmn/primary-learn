import { redirect } from 'next/navigation';
import { getCurrentUser, type SessionUser } from './session';

/**
 * 頁面層的身份檢查。layout 與 page 會同時渲染，所以每個 page 都必須自己檢查，
 * 不能假設 layout 已經擋住了（否則未登入時會解參考 null，或洩漏資料）。
 */
export async function pageUser(roles?: SessionUser['role'][]): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  if (u.mustChangePassword) redirect('/account/password');
  if (roles && !roles.includes(u.role)) redirect('/');
  return u;
}
