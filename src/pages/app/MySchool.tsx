import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Copy, Download, Plus, Trash2 } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { MINIMUM_TEAM, ROLES, STAGES, roleTitle } from '@/lib/ekoa';
import { download } from '@/lib/csv';
import { fmtDate } from '@/lib/format';
import type { ContextProfile, GovernanceStep, Organisation, Person, RoleKey } from '@/lib/types';
import { Badge, Button, ErrorNote, Field, Input, Loading, Modal, Notice, PageHeader, Panel, Select, Tabs, Textarea } from '@/components/ui';
import { SafetyQueue } from '@/components/SafetyQueue';

type Tab = 'profile' | 'people' | 'governance' | 'archive' | 'safety';

export default function MySchool() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'profile';
  const orgId = auth.activeOrg!.id;
  const { data, reload } = useData(async () => {
    const [s, consents, policies, evidence] = await Promise.all([loadSchool(orgId), api.listConsents(), api.listPolicies(), api.listEvidence()]);
    return { s, consents, policies: policies.filter((p) => p.org_id === orgId), evidence: evidence.filter((e) => e.org_id === orgId) };
  }, [orgId]);
  if (!data) return <Loading />;
  const isLiaison = auth.has('faculty_liaison');
  return (
    <div>
      <PageHeader title={data.s.org.name} lead={`${data.s.org.city}, ${data.s.org.country}. The faculty liaison owns this workspace and keeps its memory across student cohorts.`} />
      <Tabs label="School sections" value={tab} onChange={(k) => setParams({ tab: k })} tabs={[{ key: 'profile', label: 'Profile and context' }, { key: 'people', label: 'People and terms', count: data.s.members.length }, { key: 'governance', label: 'Approval chain', count: data.s.steps.length }, { key: 'archive', label: 'Archive' }, ...(isLiaison ? [{ key: 'safety' as Tab, label: 'Safety' }] : [])]} />
      {tab === 'profile' && <Profile org={data.s.org} canEdit={isLiaison} onChange={() => { void reload(); void auth.refresh(); }} />}
      {tab === 'people' && <>{isLiaison && <StudentEmails org={data.s.org} />}<People d={data} canEdit={isLiaison} onChange={reload} /></>}
      {tab === 'safety' && isLiaison && <SafetyQueue orgId={orgId} />}
      {tab === 'governance' && <Chain steps={data.s.steps} orgId={orgId} canEdit={isLiaison} onChange={reload} />}
      {tab === 'archive' && <Archive d={data} />}
    </div>
  );
}

function Profile({ org, canEdit, onChange }: { org: Organisation; canEdit: boolean; onChange: () => void }) {
  const [o, setO] = useState(org);
  const [c, setC] = useState<ContextProfile>(org.context_profile ?? { size_band: '', curriculum: '', climate_zone: '', budget_band: 'low', infrastructure: [], waste_contractor: '', governance_chain_length: 0 });
  const act = useAction();
  useEffect(() => setO(org), [org]);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="School">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" id="sp-n"><Input id="sp-n" disabled={!canEdit} value={o.name} onChange={(e) => setO({ ...o, name: e.target.value })} /></Field>
          <Field label="City" id="sp-c"><Input id="sp-c" disabled={!canEdit} value={o.city} onChange={(e) => setO({ ...o, city: e.target.value })} /></Field>
          <Field label="Enrolled students" id="sp-s" hint="Used to compute per-student metrics."><Input id="sp-s" inputMode="numeric" disabled={!canEdit} value={o.student_count ?? ''} onChange={(e) => setO({ ...o, student_count: Number(e.target.value) || null })} /></Field>
          <Field label="Grades" id="sp-g"><Input id="sp-g" disabled={!canEdit} value={o.grade_range ?? ''} onChange={(e) => setO({ ...o, grade_range: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Anonymised description" id="sp-a" hint="Shown instead of your name on records you choose to anonymise."><Input id="sp-a" disabled={!canEdit} value={o.anonymised_label ?? ''} onChange={(e) => setO({ ...o, anonymised_label: e.target.value })} /></Field></div>
        </div>
      </Panel>
      <Panel title="Context profile" action={<span className="text-xs text-ink-mute">Used to find records from similar schools</span>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Size band" id="cp-s"><Select id="cp-s" disabled={!canEdit} value={c.size_band} onChange={(e) => setC({ ...c, size_band: e.target.value })}>{['Under 500', '500–750', '750–1,000', '1,000–1,500', '1,500–2,000', 'Over 2,000'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Curriculum" id="cp-c"><Input id="cp-c" disabled={!canEdit} value={c.curriculum} onChange={(e) => setC({ ...c, curriculum: e.target.value })} /></Field>
          <Field label="Climate zone" id="cp-z"><Input id="cp-z" disabled={!canEdit} value={c.climate_zone} onChange={(e) => setC({ ...c, climate_zone: e.target.value })} /></Field>
          <Field label="Budget band" id="cp-b"><Select id="cp-b" disabled={!canEdit} value={c.budget_band} onChange={(e) => setC({ ...c, budget_band: e.target.value as ContextProfile['budget_band'] })}>{['zero', 'low', 'medium', 'high'].map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</Select></Field>
          <Field label="Waste collection" id="cp-w"><Input id="cp-w" disabled={!canEdit} value={c.waste_contractor} onChange={(e) => setC({ ...c, waste_contractor: e.target.value })} /></Field>
          <Field label="Infrastructure" id="cp-i" hint="Comma-separated, for example: canteen, garden space"><Input id="cp-i" disabled={!canEdit} value={c.infrastructure.join(', ')} onChange={(e) => setC({ ...c, infrastructure: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
        </div>
        <ErrorNote>{act.error}</ErrorNote>
        {canEdit && <Button className="mt-4" busy={act.busy} onClick={() => act.run(async () => { await api.updateOrg(org.id, { ...o, context_profile: c }); onChange(); })}>Save profile</Button>}
        {!canEdit && <p className="mt-4 text-sm text-ink-mute">Only the faculty liaison can edit the school profile.</p>}
      </Panel>
    </div>
  );
}

type Data = { s: Awaited<ReturnType<typeof loadSchool>>; consents: Awaited<ReturnType<typeof api.listConsents>> };

function People({ d, canEdit, onChange }: { d: Data; canEdit: boolean; onChange: () => void }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', age_band: '13-15' as Person['age_band'], role: 'implementation_team' as RoleKey, local_title: '', term_end: '', guardian_name: '', guardian_email: '' });
  const [link, setLink] = useState<string | null>(null);
  const [extra, setExtra] = useState<{ person: Person; role: RoleKey; local_title: string } | null>(null);
  const act = useAction();
  const order: RoleKey[] = ['faculty_liaison', 'project_lead', 'ekoa_rep', 'board_member', 'implementation_team', 'auditor', 'approver', 'alumni'];
  const roleChoices: RoleKey[] = ['implementation_team', 'board_member', 'ekoa_rep', 'project_lead', 'approver', 'faculty_liaison', ...(d.s.org.audit_school ? ['auditor' as RoleKey] : [])];
  const missing = MINIMUM_TEAM.filter((r) => !d.s.members.some((m) => m.role.role === r && (m.role.status === 'active' || m.role.status === 'outgoing')));
  const members = [...d.s.members].sort((a, b) => order.indexOf(a.role.role) - order.indexOf(b.role.role));
  const consentLink = (pid: string) => {
    const c = d.consents.find((x) => x.person_id === pid && !x.granted_at);
    return c ? `${window.location.origin}/consent/${c.token}` : null;
  };
  return (
    <div className="space-y-5">
      {missing.length > 0 && (
        <Notice tone="clay">
          <strong>Your school still needs {missing.map((r) => (r === 'faculty_liaison' ? 'a teacher as Faculty Liaison' : 'a student as Project Lead')).join(' and ')}.</strong> That is the whole minimum team: one teacher and one student. You don’t need a sustainability head; use whatever title your school already has.
        </Notice>
      )}
      {canEdit && <Button variant="dark" onClick={() => { setOpen(true); setLink(null); }}><Plus className="h-4 w-4" /> Invite a member</Button>}
      <div className="overflow-x-auto rounded-panel border border-paper-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-paper-line text-ink-mute"><tr><th className="px-4 py-3 font-bold">Name</th><th className="px-4 py-3 font-bold">Role</th><th className="px-4 py-3 font-bold">Term</th><th className="px-4 py-3 font-bold">Consent</th>{canEdit && <th className="px-4 py-3" />}</tr></thead>
          <tbody>
            {members.map(({ person, role }) => {
              const cl = consentLink(person.id);
              return (
                <tr key={role.id} className="border-b border-paper-line last:border-0">
                  <td className="px-4 py-3"><span className="font-bold">{person.display_name}</span><span className="block text-xs text-ink-mute">{person.email}{person.is_minor ? `, age ${person.age_band}` : ''}</span></td>
                  <td className="px-4 py-3">{roleTitle(role)}{role.seat ? <span className="text-ink-mute">, seat {role.seat}</span> : ''}{role.status !== 'active' && <Badge className="ml-2" tone={role.status === 'incoming' ? 'sky' : 'mute'}>{role.status}</Badge>}</td>
                  <td className="px-4 py-3 text-ink-soft">{fmtDate(role.term_start)} to {role.term_end ? fmtDate(role.term_end) : 'no end'}</td>
                  <td className="px-4 py-3">{person.consent_status === 'granted' ? <Badge tone="leaf">Granted</Badge> : person.consent_status === 'pending' ? <Badge tone="clay">Waiting</Badge> : person.consent_status === 'withdrawn' ? <Badge tone="alert">Withdrawn</Badge> : <span className="text-ink-mute">Adult</span>}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {cl && <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard?.writeText(cl); setLink(cl); }}><Copy className="h-4 w-4" /> Consent link</Button>}
                        {role.status !== 'alumni' && members.find((m) => m.person.id === person.id)?.role.id === role.id && (
                          <Button size="sm" variant="quiet" onClick={() => setExtra({ person, role: 'ekoa_rep', local_title: '' })}><Plus className="h-4 w-4" /> Role</Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {link && !open && <Notice tone="sky">Consent link copied: <span className="break-all font-bold">{link}</span>. Send it to the guardian from your school email.</Notice>}
      <Modal open={open} onClose={() => setOpen(false)} title="Invite a member">
        {link ? (
          <div className="space-y-4">
            <Notice tone="leaf">Invitation created. The account stays switched off until the guardian gives consent.</Notice>
            <Field label="Send this link to the guardian" id="cl"><Input id="cl" readOnly value={link} onFocus={(e) => e.target.select()} /></Field>
            <p className="text-sm text-ink-mute">With Supabase connected, the guardian also receives it by email automatically.</p>
            <div className="flex gap-2"><Button onClick={() => void navigator.clipboard?.writeText(link)}><Copy className="h-4 w-4" /> Copy link</Button><Link to={link.replace(window.location.origin, '')} className="self-center text-sm font-bold underline">Open it (demo)</Link></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" id="iv-n"><Input id="iv-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label="School email" id="iv-e"><Input id="iv-e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
              <Field label="Age" id="iv-a"><Select id="iv-a" value={f.age_band} onChange={(e) => setF({ ...f, age_band: e.target.value as Person['age_band'] })}><option value="13-15">13–15</option><option value="16-17">16–17</option><option value="18+">18 or over</option></Select></Field>
              <Field label="Role" id="iv-r" hint={ROLES[f.role].description}><Select id="iv-r" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as RoleKey })}>{roleChoices.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}</Select></Field>
              <Field label="What your school calls it (optional)" id="iv-lt" hint="Shown next to the role, e.g. Eco Club President."><Input id="iv-lt" maxLength={80} value={f.local_title} onChange={(e) => setF({ ...f, local_title: e.target.value })} /></Field>
              <Field label="Term ends" id="iv-t" hint="Stagger end dates across the board."><Input id="iv-t" type="date" value={f.term_end} onChange={(e) => setF({ ...f, term_end: e.target.value })} /></Field>
            </div>
            {f.age_band !== '18+' && (
              <div className="grid gap-4 rounded-field bg-paper p-4 sm:grid-cols-2">
                <Field label="Guardian name" id="iv-gn"><Input id="iv-gn" value={f.guardian_name} onChange={(e) => setF({ ...f, guardian_name: e.target.value })} /></Field>
                <Field label="Guardian email" id="iv-ge"><Input id="iv-ge" type="email" value={f.guardian_email} onChange={(e) => setF({ ...f, guardian_email: e.target.value })} /></Field>
              </div>
            )}
            {(['approver', 'faculty_liaison'] as RoleKey[]).includes(f.role) && f.age_band !== '18+' && <Notice tone="clay">Adult roles need someone aged 18 or over.</Notice>}
            <ErrorNote>{act.error}</ErrorNote>
            <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
              if (!f.name.trim() || !/\S+@\S+\.\S+/.test(f.email)) throw new Error('Add a name and a valid email.');
              if (ROLES[f.role].adult && f.age_band !== '18+') throw new Error('Adult roles need someone aged 18 or over.');
              if (f.age_band !== '18+' && !/\S+@\S+\.\S+/.test(f.guardian_email)) throw new Error('Students under 18 need a guardian email for consent.');
              const res = await api.inviteMember(auth.activeOrg!.id, { ...f, term_end: f.term_end || null }, auth.person!.id);
              setLink(res.consentToken ? `${window.location.origin}/consent/${res.consentToken}` : `${window.location.origin}/signin`);
              onChange();
            })}>Create invitation</Button>
          </div>
        )}
      </Modal>
      <Modal open={!!extra} onClose={() => setExtra(null)} title={extra ? `Another role for ${extra.person.display_name}` : ''}>
        {extra && (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">At a small school one person can hold several roles, for example the Project Lead who is also the Ekoa Representative.</p>
            <Field label="Role" id="xr-r" hint={ROLES[extra.role].description}>
              <Select id="xr-r" value={extra.role} onChange={(e) => setExtra({ ...extra, role: e.target.value as RoleKey })}>
                {roleChoices.filter((r) => !(ROLES[r].adult && extra.person.is_minor)).map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
              </Select>
            </Field>
            <Field label="What your school calls it (optional)" id="xr-t"><Input id="xr-t" maxLength={80} value={extra.local_title} onChange={(e) => setExtra({ ...extra, local_title: e.target.value })} /></Field>
            <ErrorNote>{act.error}</ErrorNote>
            <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { await api.addRole(auth.activeOrg!.id, extra.person.id, extra.role, extra.local_title, null, auth.person!.id); setExtra(null); onChange(); })}>Add role</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Chain({ steps, orgId, canEdit, onChange }: { steps: GovernanceStep[]; orgId: string; canEdit: boolean; onChange: () => void }) {
  const [rows, setRows] = useState(steps.map(({ body, decision_rights, budget_limit, typical_days, position }) => ({ body, decision_rights, budget_limit, typical_days, position })));
  const act = useAction();
  const move = (i: number, d: number) => { const r = [...rows]; const [x] = r.splice(i, 1); r.splice(i + d, 0, x); setRows(r); };
  return (
    <Panel title="Who approves what, in order">
      <p className="-mt-2 mb-4 max-w-prose text-sm text-ink-soft">Map the real route a student proposal takes in your school. Every proposal is timed against these typical days, so delays become evidence.</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid items-center gap-2 rounded-field border border-paper-line p-3 sm:grid-cols-[2rem_1fr_1.4fr_7rem_6rem_auto]">
            <span className="font-display font-bold text-ink-mute">{i + 1}</span>
            <Input aria-label="Step" disabled={!canEdit} value={r.body} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} placeholder="For example: Principal" />
            <Input aria-label="Decision rights" disabled={!canEdit} value={r.decision_rights} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, decision_rights: e.target.value } : x)))} placeholder="What they decide" />
            <Input aria-label="Budget limit" disabled={!canEdit} inputMode="numeric" value={r.budget_limit ?? ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, budget_limit: e.target.value ? Number(e.target.value) : null } : x)))} placeholder="Limit" />
            <Input aria-label="Typical days" disabled={!canEdit} inputMode="numeric" value={r.typical_days} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, typical_days: Number(e.target.value) || 0 } : x)))} />
            {canEdit && (
              <span className="flex gap-1">
                <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-ink-mute disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="p-1 text-ink-mute disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button aria-label="Remove step" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="p-1 text-ink-mute hover:text-alert"><Trash2 className="h-4 w-4" /></button>
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-mute">Columns: step, what they decide, spending limit, typical days.</p>
      <ErrorNote>{act.error}</ErrorNote>
      {canEdit && (
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={() => setRows([...rows, { body: '', decision_rights: '', budget_limit: null, typical_days: 7, position: rows.length + 1 }])}><Plus className="h-4 w-4" /> Add step</Button>
          <Button busy={act.busy} onClick={() => act.run(async () => { if (rows.some((r) => !r.body.trim())) throw new Error('Name every step.'); await api.saveSteps(orgId, rows); onChange(); })}>Save approval chain</Button>
        </div>
      )}
      {!canEdit && <p className="mt-4 text-sm text-ink-mute">Only the faculty liaison can change the approval chain.</p>}
    </Panel>
  );
}

function Archive({ d }: { d: Data & { policies: Awaited<ReturnType<typeof api.listPolicies>>; evidence: Awaited<ReturnType<typeof api.listEvidence>> } }) {
  const s = d.s;
  return (
    <div className="space-y-6">
      <Panel title="Everything this school has done" action={<Button size="sm" variant="ghost" onClick={() => download(`${s.org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-archive.json`, JSON.stringify({ exported_at: new Date().toISOString(), school: s.org, projects: s.projects, measurements: s.measurements, targets: s.targets, obstacles: s.obstacles, proposals: s.proposals, approvals: s.events, records: s.records, policies: d.policies, handovers: s.handovers }, null, 2), 'application/json')}><Download className="h-4 w-4" /> Export everything</Button>}>
        <ul className="divide-y divide-paper-line">
          {s.projects.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <Link to={`/app/projects/${p.id}`} className="font-bold hover:underline">{p.title}</Link>
              <span className="text-sm text-ink-mute">{STAGES.find((x) => x.key === p.stage)?.name}, {p.status}, {fmtDate(p.starts_on)}{p.ends_on ? ` to ${fmtDate(p.ends_on)}` : ''}. {s.measurements.filter((m) => m.project_id === p.id).length} measurements, {d.evidence.filter((e) => e.project_id === p.id).length} photos.</span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Records">{s.records.length ? <ul className="space-y-1.5 text-sm">{s.records.map((r) => <li key={r.id}><Link to={`/app/library/${r.id}`} className="font-bold hover:underline">{r.title}</Link> <span className="text-ink-mute">{r.status.replace('_', ' ')}</span></li>)}</ul> : <p className="text-sm text-ink-mute">None yet.</p>}</Panel>
        <Panel title="Policies">{d.policies.length ? <ul className="space-y-1.5 text-sm">{d.policies.map((p) => <li key={p.id}><Link to={`/app/governance/policy/${p.id}`} className="font-bold hover:underline">{p.title}</Link> <span className="text-ink-mute">v{p.version}, {p.status.replace('_', ' ')}</span></li>)}</ul> : <p className="text-sm text-ink-mute">None yet.</p>}</Panel>
      </div>
    </div>
  );
}

/** A liaison sends the Ekoa team the emails of students who should be on Ekoa. The Ekoa admins
 *  give each one a role, so students never have to wait on a school-made account. */
function StudentEmails({ org }: { org: Organisation }) {
  const auth = useAuth();
  const act = useAction();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(0);
  const emails = api.parseEmails(text);
  return (
    <Panel title="Add students by email" className="mb-6">
      <p className="mb-3 text-sm text-ink-soft">Paste the emails of the students who should use Ekoa. The Ekoa team gives each one a role here and they can sign in straight away (students under 18 after a guardian consents).</p>
      {sent > 0 && <div className="mb-3"><Notice tone="leaf">Sent {sent} {sent === 1 ? 'email' : 'emails'} to the Ekoa team. You will see the students under People once they have a role.</Notice></div>}
      <Field label="Student emails" id="se-t" hint={emails.length ? `${emails.length} found` : 'One per line, or separated by commas'}><Textarea id="se-t" rows={4} value={text} onChange={(e) => setText(e.target.value)} /></Field>
      <ErrorNote>{act.error}</ErrorNote>
      <Button className="mt-3" busy={act.busy} disabled={!emails.length} onClick={() => act.run(async () => {
        if (emails.length > 500) throw new Error('Send up to 500 emails at a time.');
        await api.submitApplication({ name: auth.person?.display_name ?? '', email: auth.person?.email ?? auth.authEmail ?? '', organisation: org.name, country: org.country, role: 'Faculty liaison', message: `Please add these ${emails.length} students to ${org.name}.`, has_lead: 'yes', lead_plan: '', kind: 'students', org_id: org.id, student_emails: emails });
        setSent(emails.length); setText('');
      })}>Send to the Ekoa team</Button>
    </Panel>
  );
}
