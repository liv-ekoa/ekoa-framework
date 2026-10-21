import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Printer, RefreshCw } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { buildSnapshot, HANDOVER_CHECKLIST } from '@/lib/handover';
import { ROLES, STAGES, STUDENT_ROLES, roleTitle } from '@/lib/ekoa';
import { fmtDate, daysUntil } from '@/lib/format';
import type { HandoverPacket, RoleKey } from '@/lib/types';
import { Badge, Button, Checkbox, Empty, ErrorNote, Loading, Notice, PageHeader, Panel, Select, Textarea, cx } from '@/components/ui';

export default function Handover() {
  const auth = useAuth();
  const orgId = auth.activeOrg!.id;
  const { data, reload } = useData(() => loadSchool(orgId), [orgId]);
  const [succ, setSucc] = useState<Record<string, string>>({});
  const act = useAction();
  if (!data) return <Loading />;
  const isLiaison = auth.has('faculty_liaison');
  const student = data.members.filter((m) => STUDENT_ROLES.includes(m.role.role) && (m.role.status === 'active' || m.role.status === 'outgoing'));
  const ending = student.filter((m) => { const d = daysUntil(m.role.term_end); return d !== null && d <= 56 && d >= -7; });
  const open = data.handovers.filter((h) => !(h.signed_out_at && h.signed_in_at && h.signed_liaison_at) || daysUntil(h.term_switch_on)! > 0);
  const done = data.handovers.filter((h) => h.signed_out_at && h.signed_in_at && h.signed_liaison_at);
  const continuity = data.handovers.length ? done.length / data.handovers.length : null;
  const name = (pid: string | null) => data.members.find((m) => m.person.id === pid)?.person.display_name ?? 'Not chosen yet';

  // Board seats on a shared time axis: one year back, one year forward.
  const t0 = Date.now() - 365 * 86_400_000;
  const t1 = Date.now() + 365 * 86_400_000;
  const pos = (iso: string) => Math.max(0, Math.min(100, ((new Date(iso).getTime() - t0) / (t1 - t0)) * 100));
  const seats = data.members.filter((m) => STUDENT_ROLES.includes(m.role.role) && m.role.status !== 'alumni').sort((a, b) => (a.role.term_end ?? '').localeCompare(b.role.term_end ?? ''));

  return (
    <div className="space-y-6">
      <PageHeader title="Handover" lead="Leaders change; the work stays. Packets start eight weeks before a term ends and are signed by the outgoing lead, the incoming lead and the faculty liaison." />

      <Panel title="Terms on the student board" action={continuity !== null && <Badge tone={continuity === 1 ? 'leaf' : 'clay'}>{Math.round(continuity * 100)}% of handovers fully signed</Badge>}>
        <div className="space-y-2.5">
          {seats.map((m) => {
            const end = m.role.term_end ?? new Date(t1).toISOString();
            const left = pos(m.role.term_start);
            const right = pos(end);
            const d = daysUntil(m.role.term_end);
            return (
              <div key={m.role.id} className="grid grid-cols-[minmax(9rem,13rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate"><span className="font-bold">{m.person.display_name}</span><span className="block text-xs text-ink-mute">{roleTitle(m.role)}{m.role.seat ? `, seat ${m.role.seat}` : ''}</span></span>
                <span className="relative h-4 rounded bg-paper-deep">
                  <span className={cx('absolute inset-y-0 rounded', m.role.status === 'incoming' ? 'border border-dashed border-sky bg-sky-100' : d !== null && d <= 56 ? 'bg-clay-600' : 'bg-leaf')} style={{ left: `${left}%`, width: `${Math.max(1, right - left)}%` }} />
                  <span className="absolute -inset-y-1 left-1/2 w-0.5 bg-ink" aria-hidden />
                </span>
                <span className="w-28 text-right text-xs text-ink-mute">{m.role.status === 'incoming' ? `starts ${fmtDate(m.role.term_start)}` : m.role.term_end ? `ends ${fmtDate(m.role.term_end)}` : 'no end date'}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-0.5 bg-ink" /> Today</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded bg-clay-600" /> Ends within 8 weeks</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded border border-dashed border-sky bg-sky-100" /> Incoming</span>
          <span>Axis: one year back to one year ahead. Staggered ends mean the board never empties at once.</span>
        </p>
      </Panel>

      {ending.filter((m) => !data.handovers.some((h) => h.from_person_id === m.person.id && h.role === m.role.role)).map((m) => (
        <Panel key={m.role.id} title={`${m.person.display_name}: ${ROLES[m.role.role].label} term ends ${fmtDate(m.role.term_end)}`}>
          <p className="text-sm text-ink-soft">Start the handover packet now. It is built from live project data, so it is never out of date.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Select aria-label="Successor" value={succ[m.role.id] ?? ''} onChange={(e) => setSucc({ ...succ, [m.role.id]: e.target.value })} className="w-auto">
              <option value="">Choose the successor</option>
              {data.members.filter((x) => x.person.id !== m.person.id && STUDENT_ROLES.includes(x.role.role)).map((x) => <option key={x.role.id} value={x.person.id}>{x.person.display_name}</option>)}
            </Select>
            <Button busy={act.busy} onClick={() => act.run(async () => {
              await api.saveHandover({ org_id: orgId, role: m.role.role, from_person_id: m.person.id, to_person_id: succ[m.role.id] || null, snapshot: await buildSnapshot(orgId), checklist: {}, note: '', signed_out_at: null, signed_in_at: null, signed_liaison_at: null, term_switch_on: m.role.term_end! });
              reload();
            })}>Start the handover packet</Button>
          </div>
          <ErrorNote>{act.error}</ErrorNote>
        </Panel>
      ))}

      {open.length ? open.map((h) => <Packet key={h.id} h={h} name={name} isLiaison={isLiaison} onChange={reload} roleMembers={data.members} />) : !ending.length && <Empty title="No handovers due">Packets appear here eight weeks before any student term ends.</Empty>}

      {done.length > 0 && (
        <Panel title="Completed handovers">
          <ul className="space-y-1 text-sm">{done.map((h) => <li key={h.id}>{ROLES[h.role].label}: {name(h.from_person_id)} to {name(h.to_person_id)}, {fmtDate(h.term_switch_on)}</li>)}</ul>
        </Panel>
      )}
    </div>
  );
}

function Packet({ h, name, isLiaison, onChange, roleMembers }: { h: HandoverPacket; name: (id: string | null) => string; isLiaison: boolean; onChange: () => void; roleMembers: { role: { id: string; person_id: string; role: RoleKey; status: string; term_end: string | null; term_start: string }; person: { id: string } }[] }) {
  const auth = useAuth();
  const [note, setNote] = useState(h.note);
  const [check, setCheck] = useState(h.checklist);
  const act = useAction();
  const me = auth.person!.id;
  const isOut = me === h.from_person_id;
  const isIn = me === h.to_person_id;
  const allSigned = h.signed_out_at && h.signed_in_at && h.signed_liaison_at;
  const allChecked = HANDOVER_CHECKLIST.every((c) => check[c.key]);
  const d = daysUntil(h.term_switch_on);
  const sign = (field: 'signed_out_at' | 'signed_in_at' | 'signed_liaison_at') => act.run(async () => { await api.saveHandover({ id: h.id, org_id: h.org_id, [field]: new Date().toISOString(), checklist: check, note }); onChange(); });

  return (
    <article className="space-y-5 rounded-panel border border-paper-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{ROLES[h.role].label}: {name(h.from_person_id)} to {name(h.to_person_id)}</h2>
          <p className="text-sm text-ink-mute">Roles switch on {fmtDate(h.term_switch_on)}{d !== null && d > 0 ? `, in ${d} days` : ''}. Snapshot from {fmtDate(h.snapshot.generated_at)}.</p>
        </div>
        <div className="no-print flex gap-2">
          <Button size="sm" variant="ghost" busy={act.busy} onClick={() => act.run(async () => { await api.saveHandover({ id: h.id, org_id: h.org_id, snapshot: await buildSnapshot(h.org_id) }); onChange(); })}><RefreshCw className="h-4 w-4" /> Refresh</Button>
          <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 font-display font-semibold">Open projects and next steps</h3>
          <ul className="space-y-2">
            {h.snapshot.projects.map((p) => (
              <li key={p.id} className="rounded-field border border-paper-line p-3 text-sm">
                <Link to={`/app/projects/${p.id}`} className="font-bold hover:underline">{p.title}</Link>
                <span className="block text-ink-mute">{STAGES.find((s) => s.key === p.stage)?.name} stage, {p.status}</span>
                <span className="block text-ink-soft">Next: {p.next_step}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-4">
          <div>
            <h3 className="mb-2 font-display font-semibold">Latest numbers</h3>
            <ul className="space-y-1 text-sm">{h.snapshot.metrics.map((m, i) => <li key={i} className="flex justify-between gap-3"><span className="text-ink-soft">{m.metric}</span><span className="font-bold tabular-nums">{m.latest ?? '—'}{m.unit === '%' ? '%' : ''}</span></li>)}</ul>
          </div>
          <div>
            <h3 className="mb-2 font-display font-semibold">Waiting for approval</h3>
            {h.snapshot.stalled_approvals.length ? <ul className="space-y-1 text-sm">{h.snapshot.stalled_approvals.map((s, i) => <li key={i}>{s.proposal}: at {s.step} for {s.days} days</li>)}</ul> : <p className="text-sm text-ink-mute">Nothing pending.</p>}
          </div>
          <div>
            <h3 className="mb-2 font-display font-semibold">Who to ask (by role)</h3>
            <p className="text-sm text-ink-soft">{h.snapshot.contacts.map((c) => c.label).join(', ')}. Contact them inside the platform.</p>
          </div>
        </section>
      </div>

      {h.snapshot.lessons.length > 0 && (
        <section>
          <h3 className="mb-2 font-display font-semibold">Lessons to keep</h3>
          <ul className="hand-note space-y-1 text-2xl">{h.snapshot.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 font-display font-semibold">Note from the outgoing lead</h3>
        {isOut || isLiaison ? <Textarea aria-label="Handover note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /> : <p className="text-ink-soft">{h.note || 'No note yet.'}</p>}
      </section>

      <section className="no-print grid gap-5 border-t border-paper-line pt-5 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-display font-semibold">Checklist</h3>
          {HANDOVER_CHECKLIST.map((c) => <Checkbox key={c.key} checked={!!check[c.key]} onChange={(v) => setCheck({ ...check, [c.key]: v })} disabled={!(isOut || isIn || isLiaison)} label={c.label} />)}
          {(isOut || isIn || isLiaison) && <Button size="sm" variant="ghost" busy={act.busy} onClick={() => act.run(async () => { await api.saveHandover({ id: h.id, org_id: h.org_id, checklist: check, note }); onChange(); })}>Save checklist and note</Button>}
        </div>
        <div className="space-y-2">
          <h3 className="font-display font-semibold">Signatures</h3>
          {([['signed_out_at', 'Outgoing lead', isOut], ['signed_in_at', 'Incoming lead', isIn], ['signed_liaison_at', 'Faculty liaison', isLiaison]] as const).map(([f, label, mine]) => (
            <div key={f} className="flex items-center justify-between gap-3 rounded-field border border-paper-line px-3 py-2 text-sm">
              <span>{label}</span>
              {h[f] ? <span className="flex items-center gap-1.5 font-bold text-leaf-600"><CheckCircle2 className="h-4 w-4" />{fmtDate(h[f])}</span> : mine ? <Button size="sm" disabled={!allChecked} busy={act.busy} onClick={() => sign(f)}>Sign</Button> : <span className="text-ink-mute">Waiting</span>}
            </div>
          ))}
          {!allChecked && <p className="text-xs text-ink-mute">Signing opens when every checklist item is ticked.</p>}
          {allSigned && isLiaison && (
            <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
              const out = roleMembers.find((m) => m.person.id === h.from_person_id && m.role.role === h.role && m.role.status !== 'incoming');
              const inc = roleMembers.find((m) => m.person.id === h.to_person_id && m.role.role === h.role && m.role.status === 'incoming');
              if (out) await api.updateRole(out.role.id, { status: 'alumni', term_end: new Date().toISOString().slice(0, 10) });
              if (inc) await api.updateRole(inc.role.id, { status: 'active', term_start: new Date().toISOString().slice(0, 10) });
              await api.saveHandover({ id: h.id, org_id: h.org_id, term_switch_on: new Date().toISOString().slice(0, 10) });
              await api.audit(auth.person!.id, 'switched roles after handover', 'role_assignments', h.id);
              onChange();
            })}>Switch roles now</Button>
          )}
          {allSigned && <Notice tone="leaf">Fully signed. Roles switch automatically on the term date if nobody switches them sooner.</Notice>}
          <ErrorNote>{act.error}</ErrorNote>
        </div>
      </section>
    </article>
  );
}
