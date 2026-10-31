import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { metricByCode } from '@/lib/ekoa';
import { formatMetric } from '@/lib/metrics';
import { fmtShort, relative } from '@/lib/format';
import { RecordTag } from '@/components/RecordTag';
import { Badge, Button, Checkbox, Empty, ErrorNote, Loading, Notice, PageHeader, Panel, Textarea } from '@/components/ui';
import type { Verification } from '@/lib/types';

/** What every T3 audit checks. The auditor ticks each one before the record can be raised to T3. */
const CHECKS = [
  { key: 'baseline', label: 'The baseline was taken on the library protocol, before the project started' },
  { key: 'raw', label: 'The raw numbers in the log add up to the results on the record' },
  { key: 'evidence', label: 'Photos, log sheets or files back up the figures' },
  { key: 'honest', label: 'The outcome class is honest, including what did not work' },
] as const;

/** The peer-audit queue of one audit school. Admins open it from the Admin console for either audit school. */
export default function AuditDesk({ orgId, embedded = false }: { orgId?: string; embedded?: boolean }) {
  const auth = useAuth();
  const myOrg = orgId ?? auth.activeOrg?.id;
  const { data, reload } = useData(async () => {
    const [vs, records, orgs, ms, evidence] = await Promise.all([api.listVerifications(), api.listRecords(), api.listOrgs(), api.listMeasurements(), api.listEvidence()]);
    return { vs: vs.filter((v) => v.verifier_org === myOrg && v.requested_tier === 3), records, orgs, ms, evidence };
  }, [myOrg]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ticks, setTicks] = useState<Record<string, Record<string, boolean>>>({});
  const act = useAction();

  const auditOrg = orgId ? data?.orgs.find((o) => o.id === orgId) : auth.activeOrg;
  if (orgId && !data) return <Loading />;
  if (!auditOrg?.audit_school)
    return (
      <Empty title="Audits are run by the Ekoa audit schools">
        Shiv Nadar School, Faridabad and Green School, Bali carry out T3 peer audits. Request one from a record’s page.
      </Empty>
    );
  if (!data) return <Loading />;
  const open = data.vs.filter((v) => v.status === 'requested' || v.status === 'in_progress');
  const done = data.vs.filter((v) => v.status === 'verified' || v.status === 'declined');
  const orgName = (id: string | null) => data.orgs.find((o) => o.id === id)?.name ?? 'A school';

  const finish = (v: Verification, verified: boolean) =>
    act.run(async () => {
      const t = ticks[v.id] ?? {};
      const text = (notes[v.id] ?? '').trim();
      if (verified && !CHECKS.every((c) => t[c.key])) throw new Error('Tick all four checks before raising the record to T3, or decline with a reason.');
      if (!text) throw new Error(verified ? 'Note what you checked and what you found.' : 'Give the school a reason, so they can fix it.');
      const checked = CHECKS.filter((c) => t[c.key]).map((c) => c.key).join(', ');
      await api.completeVerification(v, verified, `${text}${checked ? ` (Checked: ${checked}.)` : ''}`);
      reload();
    });

  return (
    <div className="space-y-6">
      {!embedded && <PageHeader title="Audit desk" lead={`${auditOrg.name} is an Ekoa audit school. You check other schools’ numbers against the Ekoa protocols so their records can reach tier T3.`} />}
      <Notice tone="sky">
        You audit numbers, not people. You see the record, its measurements and evidence that shows no one. You never see student names or contact details, and you never audit your own school.
      </Notice>

      <section>
        <h2 className="mb-3 text-2xl">Waiting for audit <span className="font-sans text-base not-italic text-ink-mute">{open.length}</span></h2>
        {open.length ? (
          <div className="space-y-5">
            {open.map((v) => {
              const r = data.records.find((x) => x.id === v.record_id);
              if (!r) return null;
              const ms = data.ms.filter((m) => m.project_id === r.project_id).sort((a, b) => a.period_end.localeCompare(b.period_end));
              const ev = data.evidence.filter((e) => e.project_id === r.project_id && !e.contains_people);
              const t = ticks[v.id] ?? {};
              return (
                <article key={v.id} className="rounded-panel border border-paper-line bg-white p-5 sm:p-6">
                  <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                    <div className="space-y-3 lg:self-start">
                      <div><RecordTag r={r} href={`/app/library/${r.id}`} compact schoolName={orgName(r.org_id)} /></div>
                      <p className="text-sm text-ink-soft">Requested by <strong>{orgName(v.requested_by_org)}</strong>, {relative(v.created_at)}.</p>
                      {v.notes && <p className="rounded-field bg-paper px-3 py-2 text-sm text-ink-soft">“{v.notes}”</p>}
                    </div>
                    <div className="min-w-0 space-y-5">
                      <div>
                        <h3 className="label-caps mb-2 text-ink-mute">Results on the record</h3>
                        <ul className="space-y-1 text-sm">
                          {r.outcomes.map((o) => (
                            <li key={o.metric_code} className="flex flex-wrap justify-between gap-2 border-b border-paper-line py-1.5 last:border-0">
                              <span className="font-bold">{metricByCode(o.metric_code)?.name ?? o.metric_code}</span>
                              <span className="tabular-nums text-ink-soft">{formatMetric(o.metric_code, o.baseline)} → {formatMetric(o.metric_code, o.result)} <Badge tone={o.tier >= 2 ? 'leaf' : 'mute'}>T{o.tier}</Badge></span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <details className="rounded-field border border-paper-line">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-bold">Raw measurements ({ms.length})</summary>
                        <div className="max-h-64 overflow-auto px-3 pb-3">
                          <table className="w-full text-left text-xs">
                            <thead className="text-ink-mute"><tr><th className="py-1 pr-2">Week ending</th><th className="py-1 pr-2">Metric</th><th className="py-1 pr-2 text-right">Value</th><th className="py-1">Tier</th></tr></thead>
                            <tbody>
                              {ms.map((m) => (
                                <tr key={m.id} className="border-t border-paper-line">
                                  <td className="py-1 pr-2">{fmtShort(m.period_end)}{m.is_baseline && <span className="ml-1 text-ink-mute">(baseline)</span>}</td>
                                  <td className="py-1 pr-2">{metricByCode(m.metric_code)?.name ?? m.metric_code}</td>
                                  <td className="py-1 pr-2 text-right tabular-nums">{formatMetric(m.metric_code, m.value)}</td>
                                  <td className="py-1">T{m.tier}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                      <div>
                        <h3 className="label-caps mb-2 text-ink-mute">Evidence without people ({ev.length})</h3>
                        {ev.length ? (
                          <ul className="space-y-1 text-sm">{ev.map((e) => <li key={e.id} className="flex items-center gap-2"><FileText className="h-4 w-4 text-ink-mute" aria-hidden />{e.caption || e.file_name}</li>)}</ul>
                        ) : <p className="text-sm text-ink-mute">No evidence files attached yet. You can decline and ask for them.</p>}
                      </div>
                      <fieldset className="space-y-2.5 rounded-field bg-paper p-4">
                        <legend className="sr-only">Audit checks</legend>
                        {CHECKS.map((c) => (
                          <Checkbox key={c.key} label={c.label} checked={!!t[c.key]} onChange={(on) => setTicks({ ...ticks, [v.id]: { ...t, [c.key]: on } })} />
                        ))}
                      </fieldset>
                      <Textarea aria-label="Audit notes" rows={3} placeholder="What you checked and what you found" value={notes[v.id] ?? ''} onChange={(e) => setNotes({ ...notes, [v.id]: e.target.value })} />
                      <div className="flex flex-wrap gap-2">
                        <Button busy={act.busy} onClick={() => void finish(v, true)}>Raise to T3: peer-audited</Button>
                        <Button variant="ghost" busy={act.busy} onClick={() => void finish(v, false)}>Decline with a reason</Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            <ErrorNote>{act.error}</ErrorNote>
          </div>
        ) : <Empty title="Nothing waiting">Schools send T3 requests from their record pages. New requests appear here.</Empty>}
      </section>

      <Panel title="Completed audits">
        {done.length ? (
          <ul className="space-y-2">
            {done.map((v) => {
              const r = data.records.find((x) => x.id === v.record_id);
              return (
                <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 rounded-field border border-paper-line px-4 py-3 text-sm">
                  <span className="min-w-0"><Link to={`/app/library/${v.record_id}`} className="font-bold hover:underline">{r?.title ?? 'Record'}</Link><span className="block text-xs text-ink-mute">{orgName(v.requested_by_org)}. {v.notes}</span></span>
                  <Badge tone={v.status === 'verified' ? 'leaf' : 'alert'}>{v.status === 'verified' ? 'Raised to T3' : 'Declined'}</Badge>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-ink-mute">No audits completed yet.</p>}
      </Panel>
    </div>
  );
}
