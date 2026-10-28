import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { FLAG_REASONS } from '@/lib/moderation';
import { fmtDateTime } from '@/lib/format';
import type { ContentFlag } from '@/lib/types';
import { Badge, Button, Empty, ErrorNote, Loading, Notice, Tabs, cx } from './ui';

const KIND: Record<ContentFlag['target_kind'], string> = { post: 'Post', evidence: 'Photo', policy_link: 'Policy link', upload: 'Photo upload (stopped)' };

/** Everything the safety filter caught or someone reported, for the adults who decide.
 *  Teachers see their own school's; stewards see the whole network. Items stay hidden until decided. */
export function SafetyQueue({ orgId }: { orgId?: string }) {
  const auth = useAuth();
  const act = useAction();
  const [view, setView] = useState<'open' | 'decided'>('open');
  const { data, reload } = useData(async () => {
    const [flags, posts, people, threads] = await Promise.all([api.listFlags(), api.listPosts().catch(() => []), api.listPeople().catch(() => []), api.listThreads().catch(() => [])]);
    return { flags: flags.filter((f) => !orgId || f.org_id === orgId), posts, people, threads };
  }, [orgId]);
  if (!data) return <Loading />;
  // One card per item: several reports about the same post are decided together.
  const groups = new Map<string, ContentFlag[]>();
  for (const f of data.flags.filter((x) => (view === 'open' ? x.status === 'open' : x.status !== 'open'))) {
    const k = f.target_kind === 'upload' ? f.id : f.target_id;
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  const list = [...groups.values()].slice(0, view === 'open' ? 200 : 40);
  const open = data.flags.filter((f) => f.status === 'open').length;
  const name = (id: string | null) => (id ? data.people.find((p) => p.id === id)?.display_name ?? 'A member' : 'The safety filter');

  return (
    <div className="space-y-4">
      <Tabs label="Safety queue" value={view} onChange={setView} tabs={[{ key: 'open', label: 'Waiting for you', count: open }, { key: 'decided', label: 'Decided' }]} />
      {view === 'open' && !list.length && <Empty title="Nothing waiting">Anything the safety filter catches or a member reports appears here, already hidden from students.</Empty>}
      {list.map((fs) => {
        const f = fs[0];
        const post = f.target_kind === 'post' ? data.posts.find((p) => p.id === f.target_id) : undefined;
        const thread = post ? data.threads.find((t) => t.id === post.thread_id) : undefined;
        const author = post ? data.people.find((p) => p.id === post.person_id) : undefined;
        const risk = fs.some((x) => x.reason === 'self_harm');
        return (
          <article key={f.id} className={cx('rounded-panel border bg-white p-5', risk ? 'border-alert' : f.status === 'open' ? 'border-clay/50' : 'border-paper-line')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={risk ? 'alert' : 'clay'}>{FLAG_REASONS[f.reason]?.label ?? f.reason}</Badge>
                <span className="text-sm font-bold">{KIND[f.target_kind]}</span>
                <span className="text-sm text-ink-mute">{fs.map((x) => (x.source === 'filter' ? 'caught by the filter' : `reported by ${name(x.reporter_person_id)}`)).join('; ')}, {fmtDateTime(f.created_at)}</span>
              </div>
              {f.status !== 'open' && <Badge tone={f.status === 'removed' ? 'mute' : 'leaf'}>{f.status === 'removed' ? 'Removed' : 'Restored'}{f.decided_by ? ` by ${name(f.decided_by)}` : ''}</Badge>}
            </div>
            {risk && f.status === 'open' && (
              <div className="mt-3"><Notice tone="clay"><span className="inline-flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Someone may be at risk. Talk to the student today and follow your school’s safeguarding procedure. The Ekoa safeguarding lead has been told too.</span></Notice></div>
            )}
            {author && <p className="mt-3 text-sm text-ink-mute">By {author.display_name}{author.is_minor ? ` (age ${author.age_band})` : ''}{thread ? <> in <Link to={`/app/network/thread/${thread.id}`} className="font-bold underline">{thread.title}</Link></> : null}</p>}
            <p className="mt-2 whitespace-pre-line rounded-field bg-alert-100/50 p-3 text-ink">{post?.body ?? f.excerpt}</p>
            {fs.some((x) => x.note) && <p className="mt-2 text-sm text-ink-soft"><span className="font-bold">Reporter’s note:</span> {fs.filter((x) => x.note).map((x) => x.note).join(' / ')}</p>}
            {f.status === 'open' && f.target_kind !== 'upload' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="danger" busy={act.busy} onClick={() => act.run(async () => { await api.decideFlag(f, 'removed', auth.person!.id); reload(); })}>Keep it removed</Button>
                <Button size="sm" variant="ghost" busy={act.busy} onClick={() => act.run(async () => { await api.decideFlag(f, 'restored', auth.person!.id); reload(); })}>Restore: it’s fine</Button>
                <span className="text-xs text-ink-mute">Hidden from students until you decide.</span>
              </div>
            )}
            {f.status === 'open' && f.target_kind === 'upload' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" busy={act.busy} onClick={() => act.run(async () => { await api.decideFlag(f, 'removed', auth.person!.id); reload(); })}>Mark as seen</Button>
                <span className="text-xs text-ink-mute">The photo was never uploaded. Talk to the student if you need to.</span>
              </div>
            )}
          </article>
        );
      })}
      <ErrorNote>{act.error}</ErrorNote>
    </div>
  );
}
