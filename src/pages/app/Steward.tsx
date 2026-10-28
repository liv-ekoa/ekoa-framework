import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { SafetyQueue } from '@/components/SafetyQueue';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { loadSchool, schoolAlerts } from '@/lib/bundle';
import { METRIC_LIBRARY, ROLES, metricByCode } from '@/lib/ekoa';
import { completeness } from '@/lib/metrics';
import { fmtDate, fmtDateTime, relative } from '@/lib/format';
import type { Application, ConsentRecord, MetricDefinition, Organisation, Person, RoleAssignment, RoleKey, SafeguardingReport } from '@/lib/types';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Meter, Modal, Notice, PageHeader, Panel, Select, Tabs, Textarea, cx } from '@/components/ui';

type Tab = 'applications' | 'students' | 'schools' | 'moderation' | 'safeguarding' | 'campaigns' | 'metrics' | 'audit';
const STAGES_APP: Application['status'][] = ['new', 'contacted', 'call_booked', 'agreement_sent', 'onboarded', 'declined'];
const APP_LABEL: Record<Application['status'], string> = { new: 'New', contacted: 'Contacted', call_booked: 'Call booked', agreement_sent: 'Agreement sent', onboarded: 'Onboarded', declined: 'Declined' };

export default function Steward() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'applications';
  const { data, reload } = useData(async () => {
    const [apps, orgs, reports, posts, threads, people, audit, campaigns, metrics, roles, consents, flags] = await Promise.all([api.listApplications(), api.listOrgs(), api.listReports(), api.listPosts(), api.listThreads(), api.listPeople(), api.listAudit(), api.listCampaigns(), api.listMetricDefs(), api.listAllRoles(), api.listConsents(), api.listFlags()]);
    const schools = await Promise.all(orgs.filter((o) => o.org_type === 'school').map((o) => loadSchool(o.id)));
    return { apps, orgs, reports, posts, threads, people, audit, campaigns, metrics, schools, roles, consents, flags };
  });
  if (!auth.isSteward) return <Empty title="Stewards only">This console is for the Ekoa core team.</Empty>;
  if (!data) return <Loading />;
  const openFlags = data.flags.filter((f) => f.status === 'open').length;
  const independents = independentStudents(data);
  const listed = data.apps.flatMap((a) => a.student_emails ?? []).filter((e) => !data.people.some((p) => p.email === e && data.roles.some((r) => r.person_id === p.id && data.orgs.find((o) => o.id === r.org_id)?.org_type === 'school')));
  const openReports = data.reports.filter((r) => r.status !== 'resolved');
  return (
    <div>
      <PageHeader title="Steward console" lead="For Ekoa admins: applications, students waiting for a role, school health, moderation and safeguarding for the whole network." />
      <Tabs label="Console sections" value={tab} onChange={(k) => setParams({ tab: k })} tabs={[
        { key: 'applications', label: 'Applications', count: data.apps.filter((a) => a.status === 'new').length },
        { key: 'students', label: 'Students', count: independents.length + listed.length },
        { key: 'schools', label: 'Schools' },
        { key: 'moderation', label: 'Moderation', count: openFlags },
        { key: 'safeguarding', label: 'Safeguarding', count: openReports.length },
        { key: 'campaigns', label: 'Campaigns' },
        { key: 'metrics', label: 'Metric library' },
        { key: 'audit', label: 'Audit log' },
      ]} />
      {tab === 'applications' && <Applications apps={data.apps} reload={reload} />}
      {tab === 'students' && <Students d={data} reload={reload} />}
      {tab === 'schools' && <Schools d={data} reload={reload} />}
      {tab === 'moderation' && <SafetyQueue />}
      {tab === 'safeguarding' && <Safeguarding reports={data.reports} reload={reload} />}
      {tab === 'campaigns' && <CampaignsAdmin d={data} reload={reload} />}
      {tab === 'metrics' && <MetricsAdmin metrics={data.metrics} reload={reload} />}
      {tab === 'audit' && (
        <Panel title="Every sensitive action is logged">
          <ul className="divide-y divide-paper-line text-sm">
            {data.audit.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-3 py-2"><span><span className="font-bold">{data.people.find((p) => p.id === a.actor_person_id)?.display_name ?? 'System'}</span> {a.action}</span><span className="text-ink-mute">{fmtDateTime(a.at)}</span></li>)}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function Applications({ apps, reload }: { apps: Application[]; reload: () => void }) {
  const auth = useAuth();
  const [sel, setSel] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');
  const act = useAction();
  return (
    <>
      <div className="grid auto-cols-[minmax(13rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
        {STAGES_APP.map((s) => (
          <section key={s} className="rounded-panel bg-paper-deep/60 p-3" aria-label={APP_LABEL[s]}>
            <h2 className="mb-2 px-1 label-caps text-ink-mute">{APP_LABEL[s]} <span className="text-ink-mute">{apps.filter((a) => a.status === s).length}</span></h2>
            <ul className="space-y-2">
              {apps.filter((a) => a.status === s).map((a) => (
                <li key={a.id}>
                  <button onClick={() => { setSel(a); setNotes(a.notes); }} className="w-full rounded-field border border-paper-line bg-white p-3 text-left text-sm hover:border-ink/40">
                    <span className="block font-bold">{a.organisation || a.name}</span>
                    <span className="block text-xs text-ink-mute">{a.role}. {a.country}. {relative(a.created_at)}</span>
                    {a.has_lead === 'no' && <span className="mt-1.5 inline-block rounded-tag bg-clay-100 px-1.5 py-0.5 text-[11px] font-bold text-clay-700">No sustainability lead yet</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.organisation || sel?.name || ''}>
        {sel && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-ink-mute">Name</dt><dd className="font-bold">{sel.name}</dd></div>
              <div><dt className="text-ink-mute">Email</dt><dd><a className="font-bold text-leaf-600 underline" href={`mailto:${sel.email}`}>{sel.email}</a></dd></div>
              <div><dt className="text-ink-mute">Role</dt><dd>{sel.role}</dd></div>
              <div><dt className="text-ink-mute">Country</dt><dd>{sel.country}</dd></div>
            </dl>
            <p className="rounded-field bg-paper p-3 text-sm text-ink-soft">{sel.message || 'No message.'}</p>
            {sel.has_lead && (
              <div className="rounded-field border border-paper-line p-3 text-sm">
                <p className="font-bold">{({ yes: 'Has a sustainability head or coordinator', eco_club: 'An eco club or student council runs it', no: 'No sustainability lead yet' } as const)[sel.has_lead]}</p>
                {sel.lead_plan && <p className="mt-1 text-ink-soft">{sel.lead_plan}</p>}
                {sel.has_lead === 'no' && <p className="mt-1 text-xs text-ink-mute">On the call, agree one teacher as faculty liaison and one student as Project Lead. That is the minimum team.</p>}
              </div>
            )}
            <Field label="Steward notes" id="ap-n"><Textarea id="ap-n" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <Field label="Status" id="ap-s"><Select id="ap-s" value={sel.status} onChange={(e) => setSel({ ...sel, status: e.target.value as Application['status'] })}>{STAGES_APP.map((s) => <option key={s} value={s}>{APP_LABEL[s]}</option>)}</Select></Field>
            {!!sel.student_emails?.length && <p className="text-sm text-ink-soft"><span className="font-bold">{sel.student_emails.length} student emails listed.</span> Give them roles from the Students tab once the school is onboarded.</p>}
            {sel.status === 'onboarded' && <Notice tone="sky">Saving creates a school workspace in onboarding status. Then invite its faculty liaison from the Schools tab, and give its listed students roles from the Students tab.</Notice>}
            <ErrorNote>{act.error}</ErrorNote>
            <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
              const before = apps.find((a) => a.id === sel.id);
              await api.updateApplication(sel.id, { status: sel.status, notes });
              if (sel.status === 'onboarded' && before?.status !== 'onboarded' && /school|coordinator|eco/i.test(sel.role)) {
                const org = await api.createOrg({ name: sel.organisation || `${sel.name}'s school`, org_type: 'school', country: sel.country, city: '', lat: null, lng: null, curriculum: null, student_count: null, grade_range: null, climate_zone: null, context_profile: null, status: 'onboarding', public_visible: false, anonymised_label: null, audit_school: false });
                // The students this school listed can now be given roles there from the Students tab.
                await api.updateApplication(sel.id, { org_id: org.id });
              }
              await api.audit(auth.person!.id, `application ${APP_LABEL[sel.status].toLowerCase()}`, 'applications', sel.id);
              setSel(null);
              reload();
            })}>Save</Button>
          </div>
        )}
      </Modal>
    </>
  );
}

type D = { roles: RoleAssignment[]; consents: ConsentRecord[]; apps: Application[]; people: Person[]; schools: Awaited<ReturnType<typeof loadSchool>>[]; orgs: Organisation[]; posts: Awaited<ReturnType<typeof api.listPosts>>; threads: Awaited<ReturnType<typeof api.listThreads>>; campaigns: Awaited<ReturnType<typeof api.listCampaigns>> };

function Schools({ d, reload }: { d: D; reload: () => void }) {
  const [inviteFor, setInviteFor] = useState<{ id: string; name: string } | null>(null);
  return (
    <div className="space-y-4">
      {inviteFor && <InviteLiaison org={inviteFor} onClose={() => setInviteFor(null)} onDone={() => { setInviteFor(null); reload(); }} />}
      {d.schools.map((s) => {
        const act = s.projects.filter((p) => p.status === 'active' && p.stage !== 'identify');
        const comp = act.length ? act.reduce((a, p) => a + completeness(p.id, s.measurements, p.starts_on), 0) / act.length : 0;
        const al = schoolAlerts(s, { isLiaison: true });
        const liaison = s.members.find((m) => m.role.role === 'faculty_liaison');
        return (
          <article key={s.org.id} className="rounded-panel border border-paper-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">{s.org.name}{s.org.audit_school && <Badge tone="leaf" className="ml-2 align-middle">Audit school</Badge>}</h2>
                <p className="text-sm text-ink-mute">{[s.org.city, s.org.country].filter(Boolean).join(', ')}. {s.org.status}. Liaison: {liaison?.person.display_name ?? 'none'}.</p>
                {!liaison && <Button size="sm" variant="dark" className="mt-2" onClick={() => setInviteFor({ id: s.org.id, name: s.org.name })}>Invite faculty liaison</Button>}
              </div>
              <div className="w-48 text-xs text-ink-mute"><p className="mb-1">Weeks with data: {act.length ? `${Math.round(comp * 100)}%` : '—'}</p><Meter value={comp} label="completeness" tone={comp >= 0.85 ? 'leaf' : 'clay'} /></div>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{s.projects.length} projects, {s.records.filter((r) => r.status === 'published').length} published records, {s.members.length} members, {s.handovers.length} handover packets.</p>
            {al.length > 0 && <ul className="mt-3 space-y-1 text-sm">{al.map((a, i) => <li key={i} className={cx(a.tone === 'alert' ? 'text-alert' : 'text-ink-soft')}>{a.text}</li>)}</ul>}
          </article>
        );
      })}
    </div>
  );
}

/** The faculty liaison is an adult staff member who owns the school's records and invites everyone else. */
function InviteLiaison({ org, onClose, onDone }: { org: { id: string; name: string }; onClose: () => void; onDone: () => void }) {
  const auth = useAuth();
  const act = useAction();
  const [f, setF] = useState({ name: '', email: '', title: '' });
  return (
    <Modal open onClose={onClose} title={`Faculty liaison for ${org.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">A teacher or staff member, never a student. They sign in with this email and then invite the school’s Project Lead and team.</p>
        <Field label="Full name" id="il-n"><Input id="il-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="School email" id="il-e"><Input id="il-e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Their title at the school (optional)" id="il-t" hint="For example Sustainability Coordinator."><Input id="il-t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <ErrorNote>{act.error}</ErrorNote>
        <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
          if (f.name.trim().length < 3) throw new Error('Add their full name.');
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) throw new Error('Add a valid email address.');
          await api.inviteMember(org.id, { name: f.name, email: f.email, age_band: '18+', role: 'faculty_liaison', term_end: null, local_title: f.title }, auth.person!.id);
          onDone();
        })}>Invite</Button>
      </div>
    </Modal>
  );
}

function Safeguarding({ reports, reload }: { reports: SafeguardingReport[]; reload: () => void }) {
  const auth = useAuth();
  const [note, setNote] = useState<Record<string, string>>({});
  const act = useAction();
  return (
    <div className="space-y-4">
      <Notice tone="sky">Respond to every report within 24 hours. Escalate to the school’s safeguarding contact, and to authorities where the law requires: in India, mandatory reporting under the POCSO Act, 2012. Never investigate a report alone.</Notice>
      {reports.map((r) => (
        <article key={r.id} className={cx('rounded-panel border bg-white p-5', r.status === 'resolved' ? 'border-paper-line' : 'border-alert/40')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-display text-lg font-semibold">{r.subject_ref}</p><p className="text-sm text-ink-mute">{r.category}. Reported by {r.reporter_contact}, {fmtDateTime(r.created_at)}. Assigned to {r.assigned_to}.</p></div>
            <Badge tone={r.status === 'resolved' ? 'leaf' : r.status === 'escalated' ? 'alert' : 'clay'}>{r.status}</Badge>
          </div>
          <p className="mt-3 text-ink">{r.details}</p>
          <ol className="mt-3 space-y-1 border-l-2 border-paper-line pl-4 text-sm text-ink-soft">{r.actions.map((a, i) => <li key={i}><span className="text-ink-mute">{fmtDateTime(a.at)}</span> {a.note}</li>)}</ol>
          {r.status !== 'resolved' && (
            <div className="mt-4 space-y-2">
              <Input aria-label="Action taken" placeholder="Record the action you took" value={note[r.id] ?? ''} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                {(['triaged', 'escalated', 'resolved'] as const).map((s) => (
                  <Button key={s} size="sm" variant={s === 'resolved' ? 'dark' : s === 'escalated' ? 'danger' : 'ghost'} busy={act.busy} onClick={() => act.run(async () => {
                    const text = note[r.id]?.trim();
                    if (!text) throw new Error('Record what you did before changing the status.');
                    await api.updateReport(r.id, { status: s, actions: [...r.actions, { at: new Date().toISOString(), note: `${text} (${s})` }] });
                    await api.audit(auth.person!.id, `safeguarding report ${s}`, 'safeguarding_reports', r.id);
                    setNote({ ...note, [r.id]: '' });
                    reload();
                  })}>Mark {s}</Button>
                ))}
              </div>
            </div>
          )}
        </article>
      ))}
      <ErrorNote>{act.error}</ErrorNote>
    </div>
  );
}

function CampaignsAdmin({ reload }: { d: D; reload: () => void }) {
  const [f, setF] = useState({ name: '', description: '', starts_on: '', ends_on: '', metric_code: 'canteen_waste_per_meal', protocol: '', sponsor: '' });
  const act = useAction();
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Create a campaign">
        <div className="space-y-3">
          <Field label="Name" id="cm-n"><Input id="cm-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Description" id="cm-d"><Textarea id="cm-d" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" id="cm-s"><Input id="cm-s" type="date" value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value })} /></Field>
            <Field label="Ends" id="cm-e"><Input id="cm-e" type="date" value={f.ends_on} onChange={(e) => setF({ ...f, ends_on: e.target.value })} /></Field>
          </div>
          <Field label="One shared metric" id="cm-m"><Select id="cm-m" value={f.metric_code} onChange={(e) => setF({ ...f, metric_code: e.target.value })}>{METRIC_LIBRARY.filter((m) => m.is_impact).map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</Select></Field>
          <Field label="Protocol" id="cm-p" hint={metricByCode(f.metric_code)?.protocol}><Textarea id="cm-p" rows={2} value={f.protocol} onChange={(e) => setF({ ...f, protocol: e.target.value })} /></Field>
          <Field label="Sponsor (optional)" id="cm-sp" hint="Sponsors are named on the campaign only and never see school data."><Input id="cm-sp" value={f.sponsor} onChange={(e) => setF({ ...f, sponsor: e.target.value })} /></Field>
          <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { if (!f.name || !f.starts_on || !f.ends_on) throw new Error('Add a name and dates.'); await api.saveCampaign({ ...f, protocol: f.protocol || metricByCode(f.metric_code)!.protocol, sponsor: f.sponsor || null }); setF({ ...f, name: '', description: '' }); reload(); })}>Create campaign</Button>
        </div>
      </Panel>
      <ErrorNote>{act.error}</ErrorNote>
    </div>
  );
}

function MetricsAdmin({ metrics, reload }: { metrics: MetricDefinition[]; reload: () => void }) {
  const [edit, setEdit] = useState<MetricDefinition | null>(null);
  const act = useAction();
  return (
    <>
      <div className="overflow-x-auto rounded-panel border border-paper-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-paper-line text-ink-mute"><tr><th className="px-4 py-3 font-bold">Metric</th><th className="px-4 py-3 font-bold">Unit</th><th className="px-4 py-3 font-bold">Frequency</th><th className="px-4 py-3 font-bold">Version</th><th className="px-4 py-3" /></tr></thead>
          <tbody>{metrics.map((m) => <tr key={m.code} className="border-b border-paper-line last:border-0"><td className="px-4 py-3 font-bold">{m.name}</td><td className="px-4 py-3">{m.unit}</td><td className="px-4 py-3">{m.frequency}</td><td className="px-4 py-3">v{m.version}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => setEdit(m)}>Edit protocol</Button></td></tr>)}</tbody>
        </table>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit ${edit?.name ?? ''}`}>
        {edit && (
          <div className="space-y-3">
            <Notice tone="clay">Changing a protocol creates a new version. Old measurements keep the version they were taken under, so comparisons stay honest.</Notice>
            <Field label="Protocol" id="me-p"><Textarea id="me-p" rows={4} value={edit.protocol} onChange={(e) => setEdit({ ...edit, protocol: e.target.value })} /></Field>
            <Field label="Comparability notes" id="me-c"><Textarea id="me-c" rows={2} value={edit.comparability_notes} onChange={(e) => setEdit({ ...edit, comparability_notes: e.target.value })} /></Field>
            <Field label="Frequency" id="me-f"><Input id="me-f" value={edit.frequency} onChange={(e) => setEdit({ ...edit, frequency: e.target.value })} /></Field>
            <ErrorNote>{act.error}</ErrorNote>
            <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { await api.upsertMetricDef({ ...edit, version: edit.version + 1 }); setEdit(null); reload(); })}>Save as version {edit.version + 1}</Button>
          </div>
        )}
      </Modal>
      <p className="mt-3 text-sm text-ink-mute">Updated {fmtDate(new Date().toISOString())}. Units never change once data exists; add a new metric instead.</p>
    </>
  );
}

const STUDENT_ROLES_ASSIGNABLE: RoleKey[] = ['project_lead', 'implementation_team', 'ekoa_rep', 'board_member', 'auditor'];

/** Students who joined on their own: anyone leading an independent workspace. */
function independentStudents(d: { people: Person[]; roles: RoleAssignment[]; orgs: Organisation[] }) {
  return d.roles
    .filter((r) => r.status !== 'alumni' && d.orgs.find((o) => o.id === r.org_id)?.org_type === 'independent')
    .map((r) => ({ role: r, person: d.people.find((p) => p.id === r.person_id), org: d.orgs.find((o) => o.id === r.org_id)! }))
    .filter((x): x is { role: RoleAssignment; person: Person; org: Organisation } => !!x.person);
}

type AssignDraft = { email: string; name: string; age_band: Person['age_band'] | ''; org_id: string; role: RoleKey; local_title: string; guardian_name: string; guardian_email: string; move_projects: boolean; known: boolean; independent: boolean };

/** Ekoa admins give roles to students: those who joined on their own, and those their school listed. */
function Students({ d, reload }: { d: D; reload: () => void }) {
  const auth = useAuth();
  const act = useAction();
  const [draft, setDraft] = useState<AssignDraft | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const schools = d.orgs.filter((o) => o.org_type === 'school');
  const independents = independentStudents(d);
  const consentLink = (personId: string) => {
    const c = d.consents.find((x) => x.person_id === personId && !x.granted_at);
    return c ? `${window.location.origin}/consent/${c.token}` : null;
  };
  const schoolRole = (email: string) => {
    const p = d.people.find((x) => x.email === email);
    const r = p && d.roles.find((x) => x.person_id === p.id && x.status !== 'alumni' && d.orgs.find((o) => o.id === x.org_id)?.org_type === 'school');
    return { person: p, role: r, school: r ? d.orgs.find((o) => o.id === r.org_id) : undefined };
  };
  const open = (email: string, orgId: string | null | undefined, independent = false) => {
    const p = d.people.find((x) => x.email === email);
    setDraft({ email, name: p?.display_name ?? '', age_band: p?.age_band ?? '', org_id: orgId ?? '', role: 'implementation_team', local_title: '', guardian_name: '', guardian_email: '', move_projects: independent, known: !!p, independent });
  };
  const lists = d.apps.filter((a) => a.student_emails?.length);

  return (
    <div className="space-y-6">
      <Notice tone="sky">Students reach Ekoa two ways: they sign up on their own as independent students, or their school lists their emails when it registers. Give each one a role at their school here. Students under 18 stay switched off until a parent or guardian consents through their link.</Notice>
      <Panel title={`Independent students (${independents.length})`}>
        {independents.length ? (
          <ul className="divide-y divide-paper-line">
            {independents.map(({ person: p, org }) => {
              const link = consentLink(p.id);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-bold">{p.display_name} <span className="font-normal text-ink-mute">{p.email}{p.is_minor ? `, age ${p.age_band}` : ''}</span></p>
                    <p className="text-sm text-ink-soft">{org.school_name ? `Attends ${org.school_name}` : 'School not given'}{[org.city, org.country].filter(Boolean).length ? `, ${[org.city, org.country].filter(Boolean).join(', ')}` : ''}. Joined {fmtDate(p.created_at)}.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.is_minor && p.consent_status !== 'granted' ? <Badge tone="clay">Waiting for guardian</Badge> : <Badge tone="leaf">Active</Badge>}
                    {link && <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard?.writeText(link).catch(() => undefined); setCopied(link); }}><Copy className="h-4 w-4" /> Consent link</Button>}
                    <Button size="sm" variant="dark" onClick={() => open(p.email, '', true)}>Assign to a school</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-ink-mute">Nobody has joined on their own yet.</p>}
        {copied && <p className="mt-3 break-all text-sm text-ink-soft">Consent link copied: <span className="font-bold">{copied}</span>. Send it to the guardian’s email, never to the student.</p>}
      </Panel>
      <Panel title="Students listed by schools">
        {lists.length ? (
          <div className="space-y-5">
            {lists.map((a) => {
              const org = d.orgs.find((o) => o.id === a.org_id);
              return (
                <section key={a.id}>
                  <h3 className="font-bold">{org?.name ?? a.organisation} <span className="font-normal text-ink-mute">from {a.name}, {fmtDate(a.created_at)}{!org ? '. Onboard the school first, or pick a school when you assign.' : ''}</span></h3>
                  <ul className="mt-2 divide-y divide-paper-line rounded-field border border-paper-line">
                    {a.student_emails!.map((email) => {
                      const st = schoolRole(email);
                      return (
                        <li key={email} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span className="min-w-0 break-all">{email}{st.person ? <span className="text-ink-mute"> ({st.person.display_name})</span> : null}</span>
                          {st.role ? <Badge tone="leaf">{ROLES[st.role.role].label}, {st.school?.name}</Badge> : <Button size="sm" onClick={() => open(email, a.org_id)}>Assign a role</Button>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : <p className="text-sm text-ink-mute">No school has listed student emails yet. Schools list them when they register, or later from My school.</p>}
      </Panel>
      <Modal open={!!draft} onClose={() => setDraft(null)} title={`Give ${draft?.name || draft?.email || ''} a role`}>
        {draft && (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">{draft.email}</p>
            {!draft.known && (
              <>
                <Field label="Student’s full name" id="as-n"><Input id="as-n" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
                <Field label="Age group" id="as-a"><Select id="as-a" value={draft.age_band} onChange={(e) => setDraft({ ...draft, age_band: e.target.value as AssignDraft['age_band'] })}><option value="">Choose</option><option value="13-15">13 to 15</option><option value="16-17">16 or 17</option><option value="18+">18 or over</option></Select></Field>
                {draft.age_band && draft.age_band !== '18+' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Guardian’s name" id="as-gn"><Input id="as-gn" value={draft.guardian_name} onChange={(e) => setDraft({ ...draft, guardian_name: e.target.value })} /></Field>
                    <Field label="Guardian’s email" id="as-ge"><Input id="as-ge" type="email" value={draft.guardian_email} onChange={(e) => setDraft({ ...draft, guardian_email: e.target.value })} /></Field>
                  </div>
                )}
              </>
            )}
            <Field label="School" id="as-o"><Select id="as-o" value={draft.org_id} onChange={(e) => setDraft({ ...draft, org_id: e.target.value })}><option value="">Choose a school</option>{schools.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Role" id="as-r"><Select id="as-r" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as RoleKey })}>{STUDENT_ROLES_ASSIGNABLE.filter((r) => r !== 'auditor' || schools.find((o) => o.id === draft.org_id)?.audit_school).map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}</Select></Field>
              <Field label="What the school calls it (optional)" id="as-t"><Input id="as-t" value={draft.local_title} onChange={(e) => setDraft({ ...draft, local_title: e.target.value })} placeholder="e.g. Eco Club President" /></Field>
            </div>
            {draft.independent && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-leaf" checked={draft.move_projects} onChange={(e) => setDraft({ ...draft, move_projects: e.target.checked })} /><span>Move the projects they started on their own into this school</span></label>}
            <ErrorNote>{act.error}</ErrorNote>
            <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
              if (!draft.org_id) throw new Error('Choose a school.');
              await api.assignStudent({ ...draft });
              await api.audit(auth.person!.id, `assigned ${draft.role}`, 'people', draft.email);
              setDraft(null);
              reload();
            })}>Assign role</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
