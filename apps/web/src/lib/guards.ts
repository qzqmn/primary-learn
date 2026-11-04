import { HttpError } from './http';
import { getCurrentUser, type SessionUser } from './session';
import type { Role } from './db/schema';

/** API 端的授權檢查：前端隱藏按鈕不是安全邊界，每個 API 都必須呼叫 */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, '請先登入');
  if (roles && !roles.includes(user.role)) throw new HttpError(403, '你沒有權限執行此操作');
  return user;
}
