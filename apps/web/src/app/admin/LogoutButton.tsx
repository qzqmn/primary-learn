'use client';

import { useRouter } from 'next/navigation';
import { send } from '@/lib/client';
import { t, useLocale } from '@/components/LocaleSwitch';

export function LogoutButton() {
  const router = useRouter();
  useLocale(); // 訂閱語系變化，切換時重新渲染
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
      {t('nav.logout')}
    </button>
  );
}
