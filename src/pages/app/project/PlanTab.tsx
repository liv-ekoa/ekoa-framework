import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { deleteBudgetLine, removeProjectMetric, saveBudget, saveBudgetLine, setProjectMetric, updateProject } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { BUDGET_CATEGORIES, CURRENCIES, METRIC_LIBRARY, ROLES, STAGES, STUDENT_ROLES, currencyFor, metricByCode, toUsd } from '@/lib/ekoa';
import { seriesFor, formatMetric } from '@/lib/metrics';
import type { ProjectBundle } from '@/lib/bundle';
import type { BudgetCategory, BudgetLine, BudgetPathway, MonitoringItem, RoleKey, Risk } from '@/lib/types';
import { Button, ErrorNote, Field, Input, Meter, Panel, Select, Textarea, cx } from '@/components/ui';

export function PlanTab({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <BriefPanel b={b} canEdit={canEdit} onChange={onChange} />
      <TargetsPanel b={b} canEdit={canEdit} onChange={onChange} />
      <BudgetPanel b={b} canEdit={canEdit} onChange={onChange} />
      <MonitoringPanel b={b} canEdit={canEdit} onChange={onChange} />
      <RisksPanel b={b} canEdit={canEdit} onChange={onChange} />
      <Panel title="Approval route">
        {b.steps.length ? (
          <ol className="space-y-2">
            {b.steps.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-3 rounded-field border border-paper-line px-3 py-2 text-sm">
                <span><span className="mr-2 font-bold tabular-nums text-ink-mute">{s.position}</span><span className="font-bold">{s.body}</span><span className="block pl-5 text-xs text-ink-mute">{s.decision_rights}</span></span>
                <span className="shrink-0 text-ink-mute">usually {s.typical_days} days</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-mute">Map your school’s approval chain under My School first.</p>
        )}
        <p className="mt-3 text-xs text-ink-mute">Total typical time: {b.steps.reduce((a, s) => a + s.typical_days, 0)} days. Submit proposals from the Approvals tab.</p>
      </Panel>
    </div>
  );
}

function BriefPanel({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const [problem, setProblem] = useState(b.project.problem);
  const [solution, setSolution] = useState(b.project.solution);
  const act = useAction();
  const dirty = problem !== b.project.problem || solution !== b.project.solution;
  return (
    <Panel title="Problem brief and solution">
      <div className="space-y-4">
        <Field label="Problem brief" id="pb" hint="What the baseline showed, in numbers, and why it matters here.">
          <Textarea id="pb" value={problem} onChange={(e) => setProblem(e.target.value)} disabled={!canEdit} rows={4} />
        </Field>
        <Field label="Solution" id="ps" hint="What you will do, who does it and where.">
          <Textarea id="ps" value={solution} onChange={(e) => setSolution(e.target.value)} disabled={!canEdit} rows={4} />
        </Field>
        <ErrorNote>{act.error}</ErrorNote>
        {canEdit && <Button disabled={!dirty} busy={act.busy} onClick={() => act.run(async () => { await updateProject(b.project.id, { problem, solution }); onChange(); })}>Save brief</Button>}
      </div>
    </Panel>
  );
}

function TargetsPanel({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const [edit, setEdit] = useState<Record<string, { baseline: string; target: string }>>(
    Object.fromEntries(b.targets.map((t) => [t.metric_code, { baseline: t.baseline?.toString() ?? '', target: t.target?.toString() ?? '' }])),
  );
  const [add, setAdd] = useState('');
  const act = useAction();
  const available = METRIC_LIBRARY.filter((m) => !b.targets.some((t) => t.metric_code === m.code));
  return (
    <Panel title="Metrics and targets">
      <div className="space-y-3">
        {b.targets.map((t) => {
          const def = metricByCode(t.metric_code);
          const s = seriesFor(b.project.id, t.metric_code, b.measurements, b.targets);
          const e = edit[t.metric_code] ?? { baseline: '', target: '' };
          return (
            <div key={t.id} className="rounded-field border border-paper-line p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{def?.name}{def && !def.is_impact && <span className="ml-2 text-xs font-normal text-ink-mute">participation, not impact</span>}</p>
                  <p className="text-xs text-ink-mute">{def?.unit}. Latest: {formatMetric(t.metric_code, s.latest)}</p>
                </div>
                {canEdit && <button aria-label={`Remove ${def?.name}`} className="rounded p-1 text-ink-mute hover:text-alert" onClick={() => act.run(async () => { await removeProjectMetric(t.id); onChange(); })}><Trash2 className="h-4 w-4" /></button>}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-mute">
                <span>Baseline</span><span>Target</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input aria-label="Baseline" placeholder="Baseline" inputMode="decimal" value={e.baseline} disabled={!canEdit} onChange={(ev) => setEdit({ ...edit, [t.metric_code]: { ...e, baseline: ev.target.value } })} />
                <Input aria-label="Target" placeholder="Target" inputMode="decimal" value={e.target} disabled={!canEdit} onChange={(ev) => setEdit({ ...edit, [t.metric_code]: { ...e, target: ev.target.value } })} />
              </div>
            </div>
          );
        })}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button busy={act.busy} onClick={() => act.run(async () => {
              for (const [code, v] of Object.entries(edit)) {
                await setProjectMetric(b.project.id, code, { baseline: v.baseline === '' ? null : Number(v.baseline), target: v.target === '' ? null : Number(v.target) });
              }
              onChange();
            })}>Save targets</Button>
            <Select aria-label="Add a metric" value={add} onChange={(e) => setAdd(e.target.value)} className="min-w-0 flex-1 basis-56">
              <option value="">Add a metric from the library</option>
              {available.map((m) => <option key={m.code} value={m.code}>{m.name} ({m.unit})</option>)}
            </Select>
            <Button variant="ghost" disabled={!add} onClick={() => act.run(async () => { await setProjectMetric(b.project.id, add, {}); setAdd(''); onChange(); })}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        )}
        <ErrorNote>{act.error}</ErrorNote>
      </div>
    </Panel>
  );
}

type LineDraft = Omit<BudgetLine, 'id' | 'project_id' | 'currency'> & { id?: string };

function BudgetPanel({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const cur = b.budgets[0];
  const [f, setF] = useState<Partial<BudgetPathway>>(cur ?? { source_type: 'school_budget', amount: 0, currency: currencyFor(b.org.country), approver: '', status: 'planned', rigidity_notes: '' });
  const [lines, setLines] = useState<LineDraft[]>(b.budgetLines.map(({ id, category, item, planned, actual, note }) => ({ id, category, item, planned, actual, note })));
  const act = useAction();
  const zero = f.source_type === 'zero_cost';
  const currency = f.currency ?? 'USD';
  const planned = lines.reduce((s, l) => s + (l.planned || 0), 0);
  const spent = lines.reduce((s, l) => s + (l.actual ?? 0), 0);
  const allActual = lines.length > 0 && lines.every((l) => l.actual !== null);
  const pastDesign = STAGES.findIndex((s) => s.key === b.project.stage) >= 2;
  const set = (i: number, patch: Partial<LineDraft>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v.replace(/,/g, '')) || 0));

  const save = () => act.run(async () => {
    if (!zero && lines.some((l) => !l.item.trim())) throw new Error('Give every budget line a short name.');
    await saveBudget({ ...f, amount: zero ? 0 : planned, project_id: b.project.id });
    const keep = new Set(lines.map((l) => l.id).filter(Boolean));
    for (const old of b.budgetLines) if (!keep.has(old.id) || zero) await deleteBudgetLine(old.id);
    if (!zero) for (const l of lines) await saveBudgetLine({ ...l, currency, project_id: b.project.id });
    onChange();
  });

  return (
    <Panel title="Budget" action={<span className="text-xs text-ink-mute">Every project states its budget</span>} className="xl:col-span-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Where the money comes from" id="bs">
          <Select id="bs" disabled={!canEdit} value={f.source_type} onChange={(e) => setF({ ...f, source_type: e.target.value as BudgetPathway['source_type'] })}>
            <option value="school_budget">School budget</option><option value="parent_association">Parent association</option><option value="grant">Grant</option><option value="sponsor">Sponsor</option><option value="zero_cost">Zero-cost</option>
          </Select>
        </Field>
        <Field label="Status" id="bst">
          <Select id="bst" disabled={!canEdit} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as BudgetPathway['status'] })}>
            {['planned', 'requested', 'approved', 'released', 'refused'].map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
          </Select>
        </Field>
        <Field label="Currency" id="bc">
          <Select id="bc" disabled={!canEdit} value={currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <Field label="Who approves the money" id="bap"><Input id="bap" disabled={!canEdit} value={f.approver ?? ''} onChange={(e) => setF({ ...f, approver: e.target.value })} /></Field>
      </div>

      {zero ? (
        <p className="mt-5 rounded-field border border-dashed border-paper-line px-4 py-3 text-sm text-ink-soft">Marked zero-cost. If you end up buying anything, switch the source back and list it, so the next school sees the real cost.</p>
      ) : (
        <div className="mt-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Budget lines</caption>
              <thead>
                <tr className="border-b border-paper-line text-xs text-ink-mute">
                  <th scope="col" className="py-2 pr-2 font-bold">What</th>
                  <th scope="col" className="py-2 pr-2 font-bold">Category</th>
                  <th scope="col" className="w-32 py-2 pr-2 text-right font-bold">Planned ({currency})</th>
                  <th scope="col" className="w-32 py-2 pr-2 text-right font-bold">Actual ({currency})</th>
                  <th scope="col" className="w-10 py-2"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.id ?? `new-${i}`} className="border-b border-paper-line align-top last:border-0">
                    <td className="py-1.5 pr-2"><Input aria-label="What" placeholder="e.g. 9 colour-coded bins" disabled={!canEdit} value={l.item} onChange={(e) => set(i, { item: e.target.value })} /></td>
                    <td className="py-1.5 pr-2">
                      <Select aria-label="Category" disabled={!canEdit} value={l.category} onChange={(e) => set(i, { category: e.target.value as BudgetCategory })}>
                        {BUDGET_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </Select>
                    </td>
                    <td className="py-1.5 pr-2"><Input aria-label="Planned" inputMode="decimal" className="text-right tabular-nums" disabled={!canEdit} value={l.planned || ''} onChange={(e) => set(i, { planned: num(e.target.value) ?? 0 })} /></td>
                    <td className="py-1.5 pr-2"><Input aria-label="Actual" inputMode="decimal" placeholder={pastDesign ? 'Not yet' : 'Later'} className="text-right tabular-nums" disabled={!canEdit} value={l.actual ?? ''} onChange={(e) => set(i, { actual: num(e.target.value) })} /></td>
                    <td className="py-1.5">{canEdit && <button className="rounded-field p-2 text-ink-mute hover:text-alert" aria-label={`Remove ${l.item || 'line'}`} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>}</td>
                  </tr>
                ))}
              </tbody>
              {lines.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-ink/15 font-bold">
                    <td className="py-2 pr-2" colSpan={2}>Total <span className="font-normal text-ink-mute">· about USD {toUsd(planned, currency).toLocaleString('en-GB')} planned</span></td>
                    <td className="py-2 pr-2 text-right tabular-nums">{planned.toLocaleString('en-GB')}</td>
                    <td className={cx('py-2 pr-2 text-right tabular-nums', allActual && spent > planned && 'text-alert')}>{lines.some((l) => l.actual !== null) ? spent.toLocaleString('en-GB') : '—'}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {!lines.length && <p className="py-3 text-sm text-ink-mute">No budget lines yet. List what you will buy or pay for, with a planned amount for each.</p>}
          {canEdit && <Button variant="quiet" size="sm" className="mt-2" onClick={() => setLines([...lines, { category: 'materials', item: '', planned: 0, actual: null, note: '' }])}><Plus className="h-4 w-4" /> Add a line</Button>}
          {allActual && planned > 0 && (
            <div className="mt-4">
              <Meter value={Math.min(1, spent / planned)} tone={spent > planned ? 'alert' : 'leaf'} label="Spent against plan" />
              <p className="mt-1.5 text-xs text-ink-mute">{spent === planned ? 'Spent exactly as planned.' : `${currency} ${Math.abs(spent - planned).toLocaleString('en-GB')} ${spent > planned ? 'over' : 'under'} plan (${Math.round((spent / planned) * 100)}%).`}</p>
            </div>
          )}
        </div>
      )}
      <div className="mt-5">
        <Field label="Budget rigidities" id="br" hint="Rules that made funding hard. These become findings in the cohort report.">
          <Textarea id="br" rows={2} disabled={!canEdit} value={f.rigidity_notes ?? ''} onChange={(e) => setF({ ...f, rigidity_notes: e.target.value })} />
        </Field>
      </div>
      <ErrorNote>{act.error}</ErrorNote>
      {canEdit && <Button className="mt-4" busy={act.busy} onClick={() => void save()}>Save budget</Button>}
    </Panel>
  );
}

function MonitoringPanel({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const [rows, setRows] = useState<MonitoringItem[]>(b.project.monitoring_plan);
  const act = useAction();
  const metricCodes = b.targets.map((t) => t.metric_code);
  return (
    <Panel title="Monitoring plan" action={<span className="text-xs text-ink-mute">Who measures what, how often</span>}>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-field border border-paper-line p-2.5">
            <Select aria-label="Metric" className="col-span-3" disabled={!canEdit} value={r.metric_code} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, metric_code: e.target.value } : x)))}>
              {[...new Set([...metricCodes, r.metric_code])].map((c) => <option key={c} value={c}>{metricByCode(c)?.name ?? c}</option>)}
            </Select>
            <Select aria-label="Who" disabled={!canEdit} value={r.who} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, who: e.target.value as RoleKey } : x)))}>
              {[...STUDENT_ROLES, 'faculty_liaison' as RoleKey].map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}
            </Select>
            <Input aria-label="Frequency" disabled={!canEdit} value={r.frequency} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} />
            {canEdit ? <button aria-label="Remove row" className="p-2 text-ink-mute hover:text-alert" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button> : <span />}
          </div>
        ))}
        {!rows.length && <p className="text-sm text-ink-mute">No monitoring yet. Add a row for each metric.</p>}
      </div>
      <ErrorNote>{act.error}</ErrorNote>
      {canEdit && (
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" disabled={!metricCodes.length} onClick={() => setRows([...rows, { metric_code: metricCodes[0], who: 'implementation_team', frequency: 'Weekly' }])}><Plus className="h-4 w-4" /> Add row</Button>
          <Button busy={act.busy} onClick={() => act.run(async () => { await updateProject(b.project.id, { monitoring_plan: rows }); onChange(); })}>Save plan</Button>
        </div>
      )}
    </Panel>
  );
}

function RisksPanel({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const [rows, setRows] = useState<Risk[]>(b.project.risks);
  const act = useAction();
  return (
    <Panel title="Risks and mitigations">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-field border border-paper-line p-2.5">
            <Input aria-label="Risk" placeholder="Risk" disabled={!canEdit} value={r.text} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            {canEdit ? <button aria-label="Remove risk" className="p-2 text-ink-mute hover:text-alert" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button> : <span />}
            <Input aria-label="Mitigation" placeholder="Mitigation" className="col-span-2" disabled={!canEdit} value={r.mitigation} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, mitigation: e.target.value } : x)))} />
          </div>
        ))}
        {!rows.length && <p className="text-sm text-ink-mute">List what could go wrong. Library records from similar schools are a good source.</p>}
      </div>
      <ErrorNote>{act.error}</ErrorNote>
      {canEdit && (
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={() => setRows([...rows, { text: '', mitigation: '' }])}><Plus className="h-4 w-4" /> Add risk</Button>
          <Button busy={act.busy} onClick={() => act.run(async () => { await updateProject(b.project.id, { risks: rows.filter((r) => r.text.trim()) }); onChange(); })}>Save risks</Button>
        </div>
      )}
    </Panel>
  );
}
