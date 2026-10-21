import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, MessagesSquare, Users } from 'lucide-react';
import * as api from '@/lib/api';
import { authorMeta, useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { metricByCode } from '@/lib/ekoa';
import { seriesFor, formatMetric } from '@/lib/metrics';
import { fmtDate, fmtDateTime, plural, relative } from '@/lib/format';
import { BarList } from '@/components/Chart';
import { Badge, Button, Checkbox, Empty, ErrorNote, Field, Input, LinkButton, Loading, Modal, Notice, PageHeader, Panel, Select, Tabs, Textarea, cx } from '@/components/ui';
import type { EventItem } from '@/lib/types';

type Tab = 'circles' | 'twin' | 'campaigns' | 'events' | 'requests';

export default function Network() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'circles';
  const { data, reload } = useData(loadAll);
  if (!data) return <Loading />;
  const inSchool = auth.activeOrg?.org_type === 'school';
  const tabs: { key: Tab; label: string }[] = [
    { key: 'circles', label: 'Circles' },
    ...(inSchool ? [{ key: 'twin' as Tab, label: 'Twin school' }] : []),
    { key: 'campaigns', label: 'Campaigns' },
    { key: 'events', label: 'Events' },
    { key: 'requests', label: 'Partner requests' },
  ];
  return (
    <div>
      <PageHeader title="Wall" lead="Circles, your twin school, campaigns and events. Group spaces only: teachers can see every thread, and contact details are blocked automatically." actions={<LinkButton to="/app/connections" variant="ghost">See your connections</LinkButton>} />
      <Tabs label="Network sections" value={tab} onChange={(k) => setParams({ tab: k })} tabs={tabs} />
      {tab === 'circles' && <Circles d={data} reload={reload} />}
      {tab === 'twin' && <TwinSchool d={data} />}
      {tab === 'campaigns' && <Campaigns d={data} reload={reload} />}
      {tab === 'events' && <Events d={data} reload={reload} />}
      {tab === 'requests' && <Requests d={data} reload={reload} />}
    </div>
  );
}

async function loadAll() {
  const [circles, members, threads, posts, twins, orgs, campaigns, parts, events, consents] = await Promise.all([
    api.listCircles(), api.listCircleMembers(), api.listThreads(), api.listPosts(), api.listTwins(), api.listOrgs(), api.listCampaigns(), api.listCampaignParticipants(), api.listEvents(), api.listConsents(),
  ]);
  return { circles, members, threads, posts, twins, orgs, campaigns, parts, events, consents };
}
type D = Awaited<ReturnType<typeof loadAll>>;

function useCrossSchoolAllowed(d: D) {
  const { person } = useAuth();
  if (!person) return false;
  if (!person.is_minor) return true;
  const c = d.consents.find((x) => x.person_id === person.id && x.granted_at && !x.withdrawn_at);
  return !!c?.scope.cross_school;
}

function Circles({ d, reload }: { d: D; reload: () => void }) {
  const auth = useAuth();
  const allowed = useCrossSchoolAllowed(d);
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [held, setHeld] = useState(false);
  const act = useAction();
  return (
    <div className="space-y-6">
      {held && <Notice tone="clay">Your post was held for review because it looked like it contained contact details. A steward will check it.</Notice>}
      {!allowed && <Notice tone="clay">Your guardian has not allowed cross-school circles. You can read your own school’s spaces only. Ask your faculty liaison if this should change.</Notice>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...d.circles].sort((a, b) => d.members.filter((m) => m.circle_id === b.id).length - d.members.filter((m) => m.circle_id === a.id).length).map((c) => {
          const members = d.members.filter((m) => m.circle_id === c.id);
          const isMember = members.some((m) => m.person_id === auth.person?.id);
          const threads = d.threads.filter((t) => t.circle_id === c.id);
          return (
            <section key={c.id} className="flex flex-col rounded-panel border border-paper-line bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <div><h2 className="font-display text-lg font-semibold">{c.name}</h2><p className="text-sm text-ink-mute">{c.description}</p></div>
                <span className="flex items-center gap-1 text-sm text-ink-mute"><Users className="h-4 w-4" />{members.length}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {threads.slice(0, 3).map((t) => (
                  <li key={t.id}><Link to={`/app/network/thread/${t.id}`} className="block rounded-field px-2 py-1.5 text-sm hover:bg-paper"><span className="font-bold text-ink">{t.title}</span><span className="block text-xs text-ink-mute">{plural(d.posts.filter((p) => p.thread_id === t.id && !p.hidden).length, 'post')}, {relative(t.created_at)}</span></Link></li>
                ))}
                {!threads.length && <li className="text-sm text-ink-mute">No threads yet.</li>}
              </ul>
              <div className="mt-4 flex gap-2">
                {isMember ? <Button size="sm" variant="ghost" disabled={!allowed} onClick={() => setOpen(c.id)}>Start a thread</Button> : <Button size="sm" disabled={!allowed} busy={act.busy} onClick={() => act.run(async () => { await api.joinCircle(c.id, auth.person!.id); reload(); })}>Join circle</Button>}
              </div>
            </section>
          );
        })}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title="Start a thread">
        <div className="space-y-4">
          <Field label="Title" id="th-t"><Input id="th-t" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="First post" id="th-b" hint="Visible to every member of the circle, including teachers."><Textarea id="th-b" value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          <ErrorNote>{act.error}</ErrorNote>
          <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
            if (!title.trim() || !body.trim()) throw new Error('Add a title and a first post.');
            const res = await api.createThread({ kind: 'circle', circle_id: open, org_id: auth.activeOrg?.id ?? null, record_id: null, title: title.trim() }, auth.person!, body.trim(), authorMeta(auth));
            setOpen(null); setTitle(''); setBody('');
            setHeld(!!res.held);
            reload();
          })}>Post thread</Button>
        </div>
      </Modal>
    </div>
  );
}

function TwinSchool({ d }: { d: D }) {
  const auth = useAuth();
  const me = auth.activeOrg!;
  const twin = d.twins.find((t) => t.org_a === me.id || t.org_b === me.id);
  const twinOrg = twin ? d.orgs.find((o) => o.id === (twin.org_a === me.id ? twin.org_b : twin.org_a)) : undefined;
  const { data } = useData(async () => (twinOrg ? { mine: await loadSchool(me.id), theirs: await loadSchool(twinOrg.id) } : null), [twinOrg?.id, me.id]);
  if (!twin || !twinOrg) return <Empty title="No twin school yet">Stewards pair schools with similar or contrasting contexts. Ask your steward for a twin.</Empty>;
  if (!data) return <Loading />;
  const latestBy = (s: Awaited<ReturnType<typeof loadSchool>>) => {
    const out: Record<string, number> = {};
    for (const t of s.targets) {
      const ser = seriesFor(t.project_id, t.metric_code, s.measurements, s.targets);
      if (ser.latest !== null) out[t.metric_code] = ser.latest;
    }
    return out;
  };
  const a = latestBy(data.mine);
  const b = latestBy(data.theirs);
  const shared = Object.keys(a).filter((k) => k in b);
  const thread = d.threads.find((t) => t.kind === 'twin' && !t.record_id && [t.org_id, t.org_b].includes(me.id) && [t.org_id, t.org_b].includes(twinOrg.id));
  return (
    <div className="space-y-6">
      <Panel title={`${me.name} and ${twinOrg.name}`} action={thread && <Link to={`/app/network/thread/${thread.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-leaf-600"><MessagesSquare className="h-4 w-4" />Twin space</Link>}>
        <p className="text-ink-soft">{twin.note}</p>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          {[me, twinOrg].map((o) => (
            <div key={o.id} className="rounded-field bg-paper p-4">
              <p className="font-bold">{o.name}</p>
              <p className="text-ink-mute">{o.city}, {o.country}. {o.student_count?.toLocaleString('en-GB')} students. {o.climate_zone}. Budget {o.context_profile?.budget_band}.</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Shared metrics, latest values">
        {shared.length ? (
          <div className="space-y-6">
            {shared.map((code) => {
              const def = metricByCode(code);
              return (
                <div key={code}>
                  <p className="mb-2 font-bold">{def?.name} <span className="font-normal text-ink-mute">({def?.unit}; {def?.higher_is_better ? 'higher' : 'lower'} is better)</span></p>
                  <BarList items={[{ label: me.name, value: a[code], tone: 'leaf' }, { label: twinOrg.name, value: b[code], tone: 'clay' }]} format={(v) => formatMetric(code, v)} max={def?.unit.startsWith('%') ? 100 : undefined} />
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-ink-mute">You do not share a metric yet. Shared metrics appear here once both schools log the same one.</p>}
      </Panel>
    </div>
  );
}

function Campaigns({ d, reload }: { d: D; reload: () => void }) {
  const auth = useAuth();
  const act = useAction();
  const now = new Date().toISOString().slice(0, 10);
  const canJoin = auth.activeOrg?.org_type === 'school' && auth.has(['project_lead', 'faculty_liaison', 'ekoa_rep']);
  return (
    <div className="space-y-5">
      {d.campaigns.map((c) => {
        const parts = d.parts.filter((p) => p.campaign_id === c.id);
        const joined = parts.some((p) => p.org_id === auth.activeOrg?.id);
        const status = c.ends_on < now ? 'Finished' : c.starts_on > now ? 'Upcoming' : 'Running';
        const def = metricByCode(c.metric_code);
        const ranked = parts.filter((p) => p.baseline !== null && p.latest !== null).map((p) => {
          const change = ((p.latest! - p.baseline!) / p.baseline!) * 100 * (def?.higher_is_better ? 1 : -1);
          return { org: d.orgs.find((o) => o.id === p.org_id)?.name ?? '', change };
        }).sort((x, y) => y.change - x.change);
        return (
          <article key={c.id} className="rounded-panel border border-paper-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">{c.name}</h2>
                <p className="text-sm text-ink-mute">{fmtDate(c.starts_on)} to {fmtDate(c.ends_on)}. Metric: {def?.name}. {c.sponsor ? `Supported by ${c.sponsor}; sponsors never see school data.` : ''}</p>
              </div>
              <Badge tone={status === 'Running' ? 'leaf' : status === 'Upcoming' ? 'sky' : 'mute'}>{status}</Badge>
            </div>
            <p className="mt-3 max-w-prose text-ink-soft">{c.description}</p>
            <p className="mt-2 text-sm text-ink-mute">Protocol: {c.protocol}</p>
            {ranked.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold">Improvement, ranked (not absolute size)</p>
                <BarList items={ranked.map((r) => ({ label: r.org, value: Math.round(r.change), tone: 'leaf' }))} format={(v) => `${v}%`} />
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-ink-mute">{parts.length} {parts.length === 1 ? 'school' : 'schools'} taking part</span>
              {canJoin && status !== 'Finished' && (joined ? <Badge tone="leaf">Your school has joined</Badge> : <Button size="sm" busy={act.busy} onClick={() => act.run(async () => { await api.joinCampaign(c.id, auth.activeOrg!.id); reload(); })}>Join the campaign</Button>)}
            </div>
          </article>
        );
      })}
      <ErrorNote>{act.error}</ErrorNote>
    </div>
  );
}

function Events({ d, reload }: { d: D; reload: () => void }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', kind: 'circle_call' as EventItem['kind'], starts_at: '', description: '', adults: '', recorded: false, circle_id: '' });
  const act = useAction();
  const canSchedule = auth.isSteward || auth.has('faculty_liaison');
  const upcoming = d.events.filter((e) => new Date(e.starts_at).getTime() > Date.now() - 3600_000);
  return (
    <div className="space-y-5">
      {canSchedule && <Button variant="dark" onClick={() => setOpen(true)}>Schedule an event</Button>}
      <ul className="space-y-3">
        {upcoming.map((e) => (
          <li key={e.id} className="flex gap-4 rounded-panel border border-paper-line bg-white p-5">
            <CalendarDays className="mt-1 h-6 w-6 shrink-0 text-leaf" aria-hidden />
            <div>
              <p className="font-display text-lg font-semibold">{e.title}</p>
              <p className="text-sm text-ink-mute">{fmtDateTime(e.starts_at)}. {e.kind.replace('_', ' ')}. {e.recorded ? 'Recorded with consent.' : 'Not recorded.'}</p>
              <p className="mt-1 text-ink-soft">{e.description}</p>
              <p className="mt-1 text-sm text-ink-mute">Adults present: {e.adults_present.join(', ')}</p>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={open} onClose={() => setOpen(false)} title="Schedule an event">
        <div className="space-y-4">
          <Notice tone="sky">Every live session needs at least two adults, one from the Ekoa team. Links are shared inside the platform only.</Notice>
          <Field label="Title" id="ev-t"><Input id="ev-t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind" id="ev-k"><Select id="ev-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as EventItem['kind'] })}><option value="circle_call">Circle call</option><option value="cohort_call">Cohort call</option><option value="workshop">Workshop</option><option value="climate_cafe">Climate Café (parents)</option></Select></Field>
            <Field label="Starts" id="ev-s"><Input id="ev-s" type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></Field>
          </div>
          <Field label="Circle (optional)" id="ev-c"><Select id="ev-c" value={f.circle_id} onChange={(e) => setF({ ...f, circle_id: e.target.value })}><option value="">None</option>{d.circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Adults present" id="ev-a" hint="Names, separated by commas. At least two."><Input id="ev-a" value={f.adults} onChange={(e) => setF({ ...f, adults: e.target.value })} /></Field>
          <Field label="Description" id="ev-d"><Textarea id="ev-d" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Checkbox checked={f.recorded} onChange={(v) => setF({ ...f, recorded: v })} label="Record this session" hint="Only if every student taking part has guardian consent for recording." />
          <ErrorNote>{act.error}</ErrorNote>
          <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
            const adults = f.adults.split(',').map((x) => x.trim()).filter(Boolean);
            if (!f.title || !f.starts_at) throw new Error('Add a title and a start time.');
            if (adults.length < 2) throw new Error('List at least two adults who will be present.');
            await api.saveEvent({ title: f.title, kind: f.kind, starts_at: new Date(f.starts_at).toISOString(), circle_id: f.circle_id || null, description: f.description, adults_present: adults, recorded: f.recorded });
            setOpen(false); reload();
          })}>Schedule</Button>
        </div>
      </Modal>
    </div>
  );
}

function Requests({ d, reload }: { d: D; reload: () => void }) {
  const auth = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const act = useAction();
  const reqs = d.threads.filter((t) => t.kind === 'partner_request');
  const canPost = auth.activeOrg?.org_type === 'school' && auth.has(['project_lead', 'ekoa_rep', 'faculty_liaison']);
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <ul className="space-y-3">
        {reqs.map((t) => (
          <li key={t.id}>
            <Link to={`/app/network/thread/${t.id}`} className="flex items-start justify-between gap-3 rounded-panel border border-paper-line bg-white p-5 hover:border-ink/40">
              <span><span className="font-display text-lg font-semibold">{t.title}</span><span className="block text-sm text-ink-mute">{d.orgs.find((o) => o.id === t.org_id)?.name}, {relative(t.created_at)}, {plural(d.posts.filter((p) => p.thread_id === t.id && !p.hidden).length, 'post')}</span></span>
              <Badge tone={t.status === 'answered' ? 'leaf' : 'clay'}>{t.status === 'answered' ? 'Answered' : 'Open'}</Badge>
            </Link>
          </li>
        ))}
        {!reqs.length && <Empty title="No requests yet">Schools post what they need; partners answer in the thread.</Empty>}
      </ul>
      {canPost && (
        <Panel title="Ask partners for help">
          <div className="space-y-4">
            <Field label="What do you need?" id="rq-t"><Input id="rq-t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: compost expertise for a hot climate" /></Field>
            <Field label="Details" id="rq-b"><Textarea id="rq-b" value={body} onChange={(e) => setBody(e.target.value)} /></Field>
            <ErrorNote>{act.error}</ErrorNote>
            <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { if (!title.trim() || !body.trim()) throw new Error('Add what you need and some detail.'); await api.createThread({ kind: 'partner_request', circle_id: null, org_id: auth.activeOrg!.id, record_id: null, title: title.trim() }, auth.person!, body.trim(), authorMeta(auth)); setTitle(''); setBody(''); reload(); })}>Post request</Button>
            <p className={cx('text-xs text-ink-mute')}>Partners reply in the thread. They never contact students directly.</p>
          </div>
        </Panel>
      )}
    </div>
  );
}
