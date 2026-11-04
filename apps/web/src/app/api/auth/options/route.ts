import { api, ok } from '@/lib/http';
import { isMailReady } from '@/lib/mail';
import { isSetupComplete } from '@/lib/setup';

export const dynamic = 'force-dynamic';

export const GET = api(async () => ok({ mailReady: isMailReady(), setupComplete: isSetupComplete() }));
