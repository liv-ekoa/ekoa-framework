import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarDays, Info, MessagesSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/hooks';
import { loadSchool, schoolAlerts } from '@/lib/bundle';
import * as api from '@/lib/api';
import { ROLES, STAGES, metricByCode } from '@/lib/ekoa';
import { seriesFor, formatMetric, completeness } from '@/lib/metrics';
import { fmtDateTime, plural, relative, daysBetween } from '@/lib/format';
import { StageRing } from '@/components/Logo';
import { Badge, Empty, LinkButton, Loading, Meter, PageHeader, Panel, cx } from '@/components/ui';
import type { RoleKey } from '@/lib/types';

export default function Dashboard() {
  const auth = useAuth();
  if (auth.isSteward) return <StewardDashboard />;
  if (auth.isPartner) return <PartnerDashboard />;
  return <SchoolDashboard />;
}

function Greeting() {
  const { person } = useAuth();
  const h = new Date().getHours();
  return <>{h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, {person?.display_name.replace(/^(Dr|Mr|Mrs|Ms|Prof)\s+/, '').split(' ')[0]}</>;
}

function Upcoming() {
  const { data } = useData(() => api.listEvents());
  const next = (data ?? []).filter((e) => new Date(e.starts_at).getTime() > Date.now()).slice(0, 4);
  return (
    <Panel title="Coming up" action={<Link to="/app/network?tab=events" className="text-sm font-bold text-leaf-600">All events</Link>}>
      {next.length ? (
        <ul className="space-y-3">
          {next.map((e) => (
            <li key={e.id} className="flex gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-ink-mute" aria-hidden />
              <div>
                <p className="font-bold text-ink">{e.title}</p>
                <p className="text-sm text-ink-mute">{fmtDateTime(e.starts_at)}. Adults present: {e.adults_present.join(', ')}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-ink-mute">No events scheduled.</p>}
    </Panel>
  );
}

function SchoolDashboard() {
  const auth = useAuth();
  const orgId = auth.activeOrg?.id;
  const { data, loading } = useData(async () => {
    if (!orgId) return null;
    const [s, threads, posts, circles, ranking, verifs] = await Promise.all([loadSchool(orgId), api.listThreads(), api.listPosts(), api.listCircles(), api.listSchoolRanking(), api.listVerifications()]);
    return { s, threads, posts, circles, ranking, audits: verifs.filter((v) => v.verifier_org === orgId && v.requested_tier === 3 && (v.status === 'requested' || v.status === 'in_progress')) };
  }, [orgId]);
  if (loading || !data) return <Loading />;
  const { s } = data;
  const isLiaison = auth.has('faculty_liaison');
  const alerts = schoolAlerts(s, { isLiaison, personId: auth.person?.id });
  const myRoles = auth.roles.filter((r) => r.org_id === orgId && r.status === 'active').map((r) => r.role as RoleKey);
  const myTasks = s.tasks.filter((t) => t.status !== 'done' && (myRoles.includes(t.owner_role) || (myRoles.includes('project_lead') && t.owner_role === 'board_member')));
  const active = s.projects.filter((p) => p.status === 'active' || p.status === 'stalled');
  const recentThreads = data.threads.filter((t) => t.kind === 'circle').slice(0, 3);
  const incoming = auth.roles.find((r) => r.org_id === orgId && r.status === 'incoming');

  return (
    <div className="space-y-6">
      <PageHeader
        title={<Greeting />}
        lead={`${s.org.name}. ${active.length} active ${active.length === 1 ? 'project' : 'projects'}, ${s.records.filter((r) => r.status === 'published').length} published records.`}
        actions={<LinkButton to="/app/projects/new" variant="dark">Start a project</LinkButton>}
      />

      {incoming && (
        <div className="rounded-panel border border-sky/30 bg-sky-100 p-5">
          <p className="font-display text-lg font-semibold">You take over as {ROLES[incoming.role].label} on {new Date(incoming.term_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.</p>
          <p className="mt-1 text-sm text-ink-soft">You have shadow access until then. Read the handover packet and add your questions.</p>
          <LinkButton to="/app/handover" variant="ghost" size="sm" className="mt-3">Open the handover packet</LinkButton>
        </div>
      )}

      {alerts.length > 0 && (
        <section aria-label="Alerts" className="space-y-2">
          {alerts.map((a, i) => (
            <Link key={i} to={a.to} className={cx('flex items-start gap-3 rounded-field border px-4 py-3 text-sm hover:border-ink/40', a.tone === 'alert' ? 'border-alert/30 bg-alert-100' : a.tone === 'clay' ? 'border-clay-600/40 bg-clay-100' : 'border-sky/30 bg-sky-100')}>
              {a.tone === 'sky' ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky" /> : <AlertTriangle className={cx('mt-0.5 h-4 w-4 shrink-0', a.tone === 'alert' ? 'text-alert' : 'text-clay-700')} />}
              <span className="flex-1 text-ink">{a.text}</span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-mute" />
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Projects" action={<Link to="/app/projects" className="text-sm font-bold text-leaf-600">All projects</Link>}>
            {active.length ? (
              <ul className="divide-y divide-paper-line">
                {active.map((p) => {
                  const stage = STAGES.find((x) => x.key === p.stage)!;
                  const lead = s.targets.find((t) => t.project_id === p.id);
                  const ser = lead ? seriesFor(p.id, lead.metric_code, s.measurements, s.targets) : null;
                  const comp = completeness(p.id, s.measurements, p.starts_on);
                  return (
                    <li key={p.id} className="py-4 first:pt-0 last:pb-0">
                      <Link to={`/app/projects/${p.id}`} className="group grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                        <StageRing stage={p.stage} size={40} />
                        <div className="min-w-0">
                          <p className="font-display text-lg font-semibold group-hover:underline">{p.title}</p>
                          <p className="text-sm text-ink-mute">Stage {stage.n}: {stage.name}. Next gate signed by {stage.signer === 'automatic' ? 'the platform' : ROLES[stage.signer].label}.</p>
                          {p.stage !== 'identify' && <div className="mt-2 flex max-w-xs items-center gap-2 text-xs text-ink-mute"><Meter value={comp} label="Data completeness" tone={comp > 0.85 ? 'leaf' : 'clay'} /><span className="shrink-0">{Math.round(comp * 100)}% of weeks logged</span></div>}
                        </div>
                        {ser && ser.latest !== null && (
                          <div className="text-left sm:text-right">
                            <p className="text-xs text-ink-mute">{metricByCode(ser.code)?.name}</p>
                            <p className="font-display text-xl font-bold tabular-nums">{formatMetric(ser.code, ser.latest)}</p>
                            <p className={cx('text-xs font-bold', ser.improving ? 'text-leaf-600' : 'text-lesson-600')}>from {formatMetric(ser.code, ser.baseline)}{ser.target !== null ? `, target ${formatMetric(ser.code, ser.target)}` : ''}</p>
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title="No active projects" action={<LinkButton to="/app/projects/new">Start from a template</LinkButton>}>Every project begins with a baseline audit. The 5-day waste audit template is the quickest start.</Empty>
            )}
          </Panel>

          <Panel title="Your tasks">
            {myTasks.length ? (
              <ul className="space-y-2">
                {myTasks.slice(0, 8).map((t) => {
                  const p = s.projects.find((x) => x.id === t.project_id);
                  const overdue = t.due_on && daysBetween(t.due_on) > 0;
                  return (
                    <li key={t.id}>
                      <Link to={`/app/projects/${t.project_id}?tab=tasks`} className="flex items-center justify-between gap-3 rounded-field border border-paper-line px-3 py-2.5 hover:border-ink/40">
                        <span><span className="font-bold text-ink">{t.title}</span><span className="block text-xs text-ink-mute">{p?.title}</span></span>
                        {overdue ? <Badge tone="alert">Overdue</Badge> : t.status === 'doing' ? <Badge tone="sky">In progress</Badge> : <Badge>To do</Badge>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-ink-mute">Nothing assigned to your role right now.</p>}
          </Panel>
        </div>

        <div className="space-y-6">
          {s.org.audit_school && auth.has(['auditor', 'faculty_liaison']) && (
            <Link to="/app/audit" className="block rounded-panel border border-clay/40 bg-clay-50 p-5 hover:border-clay">
              <p className="label-caps text-clay-700">Ekoa audit school</p>
              <p className="mt-1 font-display text-3xl font-semibold">{plural(data.audits.length, 'record')} waiting for audit</p>
              <p className="mt-1 text-sm text-ink-soft">Open the audit desk to check them against the protocols.</p>
            </Link>
          )}
          <RankCard ranking={data.ranking} orgId={s.org.id} />
          <Panel title="From the circles" action={<Link to="/app/network" className="text-sm font-bold text-leaf-600">Wall</Link>}>
            <ul className="space-y-3">
              {recentThreads.map((t) => {
                const n = data.posts.filter((p) => p.thread_id === t.id && !p.hidden).length;
                const c = data.circles.find((x) => x.id === t.circle_id);
                return (
                  <li key={t.id}>
                    <Link to={`/app/network/thread/${t.id}`} className="flex gap-3 hover:underline">
                      <MessagesSquare className="mt-0.5 h-5 w-5 shrink-0 text-ink-mute" aria-hidden />
                      <span><span className="font-bold text-ink">{t.title}</span><span className="block text-xs text-ink-mute">{c?.name} circle, {plural(n, 'post')}, {relative(t.created_at)}</span></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Upcoming />
        </div>
      </div>
    </div>
  );
}

function RankCard({ ranking, orgId }: { ranking: api.RankRow[]; orgId: string }) {
  const me = ranking.find((r) => r.org_id === orgId);
  return (
    <Link to="/ranking" className="block rounded-panel bg-moss p-5 text-paper hover:bg-moss-800">
      <p className="label-caps text-paper/80">School ranking</p>
      {me ? (
        <>
          <p className="mt-1 font-display text-4xl font-semibold italic">#{me.position} <span className="font-sans text-base not-italic text-paper/80">of {ranking.length}</span></p>
          <p className="mt-1 text-sm text-paper/85">{Math.round(me.score * 10) / 10} points from {plural(me.verified_records, 'verified record')}{me.adopting_schools ? `, adapted by ${plural(me.adopting_schools, 'school')}` : ''}.</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-paper/85">Not ranked yet. Publish a verified record (T2 or higher) to enter the table.</p>
      )}
    </Link>
  );
}

function StewardDashboard() {
  const { data } = useData(async () => {
    const [orgs, apps, reports, posts, members] = await Promise.all([api.listOrgs('school'), api.listApplications(), api.listReports(), api.listPosts(), api.listCohortMembers()]);
    const schools = await Promise.all(orgs.map((o) => loadSchool(o.id)));
    return { orgs, apps, reports, posts, members, schools };
  });
  if (!data) return <Loading />;
  const openReports = data.reports.filter((r) => r.status !== 'resolved');
  const held = data.posts.filter((p) => p.hidden && p.flagged);
  return (
    <div className="space-y-6">
      <PageHeader title={<Greeting />} lead="Network health across member schools." actions={<LinkButton to="/app/steward" variant="dark">Open steward console</LinkButton>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/app/steward?tab=applications" className="rounded-panel border border-paper-line bg-white p-5 hover:border-ink/40"><p className="text-sm text-ink-mute">New applications</p><p className="font-display text-3xl font-bold">{data.apps.filter((a) => a.status === 'new').length}</p></Link>
        <Link to="/app/steward?tab=safeguarding" className={cx('rounded-panel border p-5 hover:border-ink/40', openReports.length ? 'border-alert/40 bg-alert-100' : 'border-paper-line bg-white')}><p className="text-sm text-ink-mute">Open safeguarding reports</p><p className="font-display text-3xl font-bold">{openReports.length}</p></Link>
        <Link to="/app/steward?tab=moderation" className="rounded-panel border border-paper-line bg-white p-5 hover:border-ink/40"><p className="text-sm text-ink-mute">Posts held for review</p><p className="font-display text-3xl font-bold">{held.length}</p></Link>
      </div>
      <Panel title="Schools">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-ink-mute"><tr><th className="py-2 pr-4 font-bold">School</th><th className="py-2 pr-4 font-bold">Active projects</th><th className="py-2 pr-4 font-bold">Data completeness</th><th className="py-2 pr-4 font-bold">Alerts</th></tr></thead>
            <tbody>
              {data.schools.map((s) => {
                const act = s.projects.filter((p) => p.status === 'active' && p.stage !== 'identify');
                const comp = act.length ? act.reduce((a, p) => a + completeness(p.id, s.measurements, p.starts_on), 0) / act.length : 0;
                const al = schoolAlerts(s, { isLiaison: false });
                return (
                  <tr key={s.org.id} className="border-t border-paper-line">
                    <td className="py-3 pr-4"><span className="font-bold">{s.org.name}</span><span className="block text-xs text-ink-mute">{s.org.city}, {s.org.country}</span></td>
                    <td className="py-3 pr-4 tabular-nums">{s.projects.filter((p) => p.status === 'active').length}</td>
                    <td className="py-3 pr-4"><div className="flex items-center gap-2"><div className="w-24"><Meter value={comp} label="completeness" tone={comp >= 0.85 ? 'leaf' : 'clay'} /></div><span className="tabular-nums">{act.length ? `${Math.round(comp * 100)}%` : '—'}</span></div></td>
                    <td className="py-3 pr-4">{al.length ? <Badge tone={al.some((x) => x.tone === 'alert') ? 'alert' : 'clay'}>{al.length}</Badge> : <Badge tone="leaf">None</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Upcoming />
    </div>
  );
}

function PartnerDashboard() {
  const auth = useAuth();
  const { data } = useData(async () => {
    const [vs, threads] = await Promise.all([api.listVerifications(), api.listThreads()]);
    return { vs: vs.filter((v) => v.verifier_org === auth.activeOrg?.id && v.status !== 'verified' && v.status !== 'declined'), threads: threads.filter((t) => t.kind === 'partner_request') };
  }, [auth.activeOrg?.id]);
  if (!data) return <Loading />;
  return (
    <div className="space-y-6">
      <PageHeader title={<Greeting />} lead={`${auth.activeOrg?.name}. Partners help in group spaces and verify outcomes.`} actions={<LinkButton to="/app/partner" variant="dark">Open partner desk</LinkButton>} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/app/partner" className="rounded-panel border border-paper-line bg-white p-5 hover:border-ink/40"><p className="text-sm text-ink-mute">Verification requests waiting</p><p className="font-display text-3xl font-bold">{data.vs.length}</p></Link>
        <Link to="/app/network?tab=requests" className="rounded-panel border border-paper-line bg-white p-5 hover:border-ink/40"><p className="text-sm text-ink-mute">Open school requests</p><p className="font-display text-3xl font-bold">{data.threads.filter((t) => t.status === 'open').length}</p></Link>
      </div>
      <Upcoming />
    </div>
  );
}
