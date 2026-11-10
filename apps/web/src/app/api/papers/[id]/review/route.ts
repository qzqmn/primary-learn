import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api, HttpError, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { assertPaperCompliance } from '@/lib/papers';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** 管理員覆核：approved / rejected + reviewNote + audit。通過前再跑一次合規閘（license 為自填、不信任）。 */
export const POST = api(async (req, ctx) => {
  const admin = await requireUser(['admin']);
  const { id } = await ctx.params;
  const row = getDb().select().from(papers).where(eq(papers.id, id)).get();
  if (!row) throw new HttpError(404, '找不到此試卷');
  const b = await readJson(req, z.object({
    decision: z.enum(['approved', 'rejected']),
    reviewNote: z.string().trim().max(500).optional(),
  }));

  if (b.decision === 'approved') {
    let questions: unknown[] = [];
    try { questions = JSON.parse(row.questions) as unknown[]; } catch { /* 空 */ }
    assertPaperCompliance({
      kind: row.kind,
      title: row.title,
      license: row.license,
      licenseUrl: row.licenseUrl,
      sourceUrl: row.sourceUrl,
      retrievedAt: row.retrievedAt,
      adaptationNote: row.adaptationNote,
      questions,
    });
  }

  getDb().update(papers).set({
    status: b.decision,
    reviewNote: b.reviewNote ?? null,
    reviewedBy: admin.id,
    reviewedAt: Date.now(),
  }).where(eq(papers.id, id)).run();
  audit({ actorId: admin.id, action: `paper.${b.decision}`, target: id, meta: { reviewNote: b.reviewNote ?? null } });
  return ok();
});
