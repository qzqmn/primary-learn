import { pageUser } from '@/lib/pageAuth';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { visiblePapers, safePaper, genSourceOptions } from '@/lib/papers';
import { PaperTools } from './PaperTools';

export const dynamic = 'force-dynamic';
export const metadata = { title: '試卷管理' };

export default async function PapersPage() {
  const me = await pageUser(['admin', 'teacher']);
  const names = new Map<string, string>(getDb().select({ id: users.id, name: users.displayName }).from(users).all().map((u): [string, string] => [u.id, u.name]));
  const list = visiblePapers(me).map((p) => ({ ...safePaper(p), ownerName: names.get(p.ownerId) ?? '—' }));
  return <PaperTools papers={list} isAdmin={me.role === 'admin'} currentUserId={me.id} genSources={genSourceOptions()} />;
}

