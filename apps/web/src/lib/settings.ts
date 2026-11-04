import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { settings } from './db/schema';

export function getSetting(key: string): string | null {
  return getDb().select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}

export function setSetting(key: string, value: string) {
  getDb().insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } }).run();
}

export function deleteSetting(key: string) {
  getDb().delete(settings).where(eq(settings.key, key)).run();
}

export const getOrgName = () => getSetting('org_name') ?? '學童通';
