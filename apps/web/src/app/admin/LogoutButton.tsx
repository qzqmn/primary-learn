'use client';

import { useRouter } from 'next/navigation';
import { send } from '@/lib/client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="font-semibold text-pen underline underline-offset-2"
      onClick={async () => {
        await send('/api/auth/logout');
        router.push('/login');
        router.refresh();
      }}
    >
      登出
    </button>
  );
}
