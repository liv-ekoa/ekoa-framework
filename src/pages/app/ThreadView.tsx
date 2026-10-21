import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EyeOff, Lock } from 'lucide-react';
import * as api from '@/lib/api';
import { authorMeta, useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { ROLES } from '@/lib/ekoa';
import { fmtDateTime } from '@/lib/format';
import { ReportConcern } from '@/components/ReportConcern';
import { Avatar, Badge, Button, Empty, ErrorNote, Loading, Notice, Textarea } from '@/components/ui';

export default function ThreadView() {
  const { id } = useParams();
  const auth = useAuth();
  const { data, reload, error } = useData(async () => {
    const [t, posts, people, roles, orgs, circles, records] = await Promise.all([api.getThread(id!), api.listPosts(), api.listPeople().catch(() => []), api.listAllRoles().catch(() => []), api.listOrgs(), api.listCircles(), api.listRecords()]);
    return { t, posts: posts.filter((p) => p.thread_id === id), people, roles, orgs, circles, records };
  }, [id]);
  const [body, setBody] = useState('');
  const [held, setHeld] = useState<string | null>(null);
  const act = useAction();
  if (error) return <Empty title="Thread not found" />;
  if (!data) return <Loading />;
  const { t } = data;
  const canModerate = auth.isSteward || auth.has('faculty_liaison');
  const circle = data.circles.find((c) => c.id === t.circle_id);
  const record = data.records.find((r) => r.id === t.record_id);
  const who = (post: (typeof data.posts)[number]) => {
    if (post.author_name) return { name: post.author_name, role: post.author_role, org: post.author_org, adult: !post.author_is_minor };
    const p = data.people.find((x) => x.id === post.person_id);
    const r = data.roles.find((x) => x.person_id === post.person_id && x.status !== 'alumni');
    const o = data.orgs.find((x) => x.id === r?.org_id);
    return { name: p?.display_name ?? 'Member', role: r ? (r.local_title?.trim() || ROLES[r.role].label) : '', org: o?.name ?? '', adult: !p?.is_minor };
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={t.kind === 'partner_request' ? '/app/network?tab=requests' : '/app/network'} className="text-sm font-bold text-ink-mute hover:text-ink">Network</Link>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t.title}</h1>
      <p className="mt-1 text-sm text-ink-mute">
        {t.kind === 'circle' ? `${circle?.name} circle` : t.kind === 'twin' ? 'Twin and introduction space' : 'Partner request'}. {record && <>About the record <Link to={`/app/library/${record.id}`} className="font-bold text-leaf-600 underline">{record.title}</Link>.</>}
      </p>
      <div className="mt-4"><Notice tone="sky"><span className="inline-flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0" />Group space. Faculty liaisons and Ekoa stewards can read everything here. Phone numbers, emails and social handles are blocked.</span></Notice></div>

      <ol className="mt-6 space-y-4">
        {data.posts.map((p) => {
          const w = who(p);
          if (p.hidden && !canModerate) {
            return <li key={p.id} className="flex items-center gap-2 rounded-panel border border-dashed border-paper-line p-4 text-sm text-ink-mute"><EyeOff className="h-4 w-4" /> A post here is held for review.</li>;
          }
          return (
            <li key={p.id} className={p.hidden ? 'rounded-panel border border-alert/40 bg-alert-100/50 p-4' : 'rounded-panel border border-paper-line bg-white p-4'}>
              <div className="flex items-start gap-3">
                <Avatar name={w.name} tone={w.adult ? 'moss' : 'leaf'} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><span className="font-bold">{w.name}</span> <span className="text-ink-mute">{w.role}{w.org ? `, ${w.org}` : ''}. {fmtDateTime(p.created_at)}</span></p>
                  <p className="mt-1.5 whitespace-pre-line text-ink">{p.body}</p>
                  {p.hidden && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge tone="alert">Held by the safeguarding filter</Badge>
                      <Button size="sm" variant="ghost" onClick={() => act.run(async () => { await api.moderatePost(p.id, { hidden: false }); await api.audit(auth.person!.id, 'released held post', 'posts', p.id); reload(); })}>Release</Button>
                      <Button size="sm" variant="danger" onClick={() => act.run(async () => { await api.moderatePost(p.id, { body: '[Removed by a moderator]', hidden: false }); await api.audit(auth.person!.id, 'removed post', 'posts', p.id); reload(); })}>Remove text</Button>
                    </div>
                  )}
                </div>
                {!p.hidden && <ReportConcern variant="icon" subject={`Post by ${w.name} in “${t.title}”`} />}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-3 rounded-panel border border-paper-line bg-white p-5">
        {held && <Notice tone="clay">Your post was held for review because it looked like it contained a {held}. A steward will check it.</Notice>}
        <Textarea aria-label="Reply" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply" />
        <ErrorNote>{act.error}</ErrorNote>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { if (!body.trim()) throw new Error('Write something first.'); const r = await api.addPost(t, auth.person!, body.trim(), authorMeta(auth)); setHeld(r.held); setBody(''); if (t.kind === 'partner_request' && auth.isPartner) await api.updateThread(t.id, { status: 'answered' }); reload(); })}>Post reply</Button>
          {canModerate && t.status !== 'closed' && <Button variant="quiet" onClick={() => act.run(async () => { await api.updateThread(t.id, { status: 'closed' }); reload(); })}>Close thread</Button>}
        </div>
      </div>
    </div>
  );
}
