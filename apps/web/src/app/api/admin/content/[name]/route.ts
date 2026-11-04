import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { contentPacks } from '@/lib/db/schema';
import { reloadCatalog } from '@/lib/content/registry';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const find = (name: string) => {
  const row = getDb().select().from(contentPacks).where(eq(contentPacks.name, name)).get();
  if (!row) throw new HttpError(404, '找不到此內容包');
  return row;
};

export const GET = api(async (_req, ctx) => {
  await requireUser(['admin']);
  const row = find((await ctx.params).name);
  return new Response(row.json, { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${row.name}.json"`, 'cache-control': 'no-store' } });
});

export const PATCH = api(async (req, ctx) => {
  const admin = await requireUser(['admin']);
  const row = find((await ctx.params).name);
  const { enabled } = await readJson(req, z.object({ enabled: z.boolean() }));
  getDb().update(contentPacks).set({ enabled }).where(eq(contentPacks.name, row.name)).run();
  reloadCatalog();
  audit({ actorId: admin.id, action: enabled ? 'content.enable' : 'content.disable', target: row.name });
  return ok();
});

export const DELETE = api(async (_req, ctx) => {
  const admin = await requireUser(['admin']);
  const row = find((await ctx.params).name);
  getDb().delete(contentPacks).where(eq(contentPacks.name, row.name)).run();
  reloadCatalog();
  audit({ actorId: admin.id, action: 'content.delete', target: row.name });
  return ok();
});
