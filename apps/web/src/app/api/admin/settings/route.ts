import { z } from 'zod';
import { api, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/guards';
import { setSetting } from '@/lib/settings';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const PATCH = api(async (req) => {
  const admin = await requireUser(['admin']);
  const b = await readJson(
    req,
    z.object({
      orgName: z.string().trim().min(1).max(40).optional(),
      teacherSignup: z.enum(['closed', 'approval', 'auto']).optional(),
      teacherDomains: z.string().max(300).optional(),
      parentSignup: z.boolean().optional(),
    }),
  );
  if (b.orgName) setSetting('org_name', b.orgName);
  if (b.teacherSignup) setSetting('teacher_signup', b.teacherSignup);
  if (b.teacherDomains !== undefined) {
    const list = b.teacherDomains.split(/[,\s]+/).map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));
    setSetting('teacher_domains', list.join(','));
  }
  if (b.parentSignup !== undefined) setSetting('parent_signup', b.parentSignup ? 'on' : 'off');
  audit({ actorId: admin.id, action: 'settings.update', meta: b });
  return ok();
});
