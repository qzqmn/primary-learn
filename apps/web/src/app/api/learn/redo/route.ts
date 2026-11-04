import { api, ok } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { startRedo } from '@/lib/practice';

export const dynamic = 'force-dynamic';
export const POST = api(async () => ok(startRedo(await requireUser(['student']))));
