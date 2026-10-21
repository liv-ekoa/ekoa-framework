import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { loadProjectBundle } from '@/lib/bundle';
import { draftRecord } from '@/lib/ai';
import { CATEGORIES, OBSTACLE_TAXONOMY, OUTCOMES, metricByCode } from '@/lib/ekoa';
import type { ImplementationRecord, OutcomeClass } from '@/lib/types';
import { Button, Checkbox, ErrorNote, Field, Input, Loading, Notice, PageHeader, Panel, Select, Textarea, cx } from '@/components/ui';

export default function RecordEditor() {
  const { id } = useParams();
  const auth = useAuth();
  const nav = useNavigate();
  const { data } = useData(() => api.getRecord(id!), [id]);
  const [r, setR] = useState<ImplementationRecord | null>(null);
  const act = useAction();
  useEffect(() => { if (data) setR(data); }, [data]);
  if (!r) return <Loading />;
  const set = <K extends keyof ImplementationRecord>(k: K, v: ImplementationRecord[K]) => setR({ ...r, [k]: v });
  const canEdit = auth.has(['project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison'], r.org_id);
  if (!canEdit) return <Notice tone="clay">Only members of the school that owns this record can edit it.</Notice>;

  const redraft = () => act.run(async () => {
    if (!r.project_id) throw new Error('This record is not linked to a project.');
    const d = await draftRecord(await loadProjectBundle(r.project_id));
    setR({ ...r, outcomes: d.outcomes ?? r.outcomes, approval_summary: d.approval_summary ?? r.approval_summary, obstacles: r.obstacles.length ? r.obstacles : d.obstacles ?? [], summary: r.summary || d.summary || '', budget_summary: d.budget_summary ?? r.budget_summary, budget_amount_usd: d.budget_amount_usd ?? r.budget_amount_usd, timeline: r.timeline || d.timeline || '', ai_drafted: true });
  });

  const save = () => act.run(async () => {
    await api.saveRecord({ ...r, ai_drafted: false });
    nav(r.project_id ? `/app/projects/${r.project_id}?tab=record` : `/app/library/${r.id}`);
  });

  return (
    <div>
      <PageHeader
        title={`Edit record: ${r.title}`}
        lead="Write for a student at another school who has never heard of yours. Numbers come from your measurements; the words are yours."
        actions={<><Button variant="ghost" onClick={redraft} busy={act.busy}><Sparkles className="h-4 w-4" /> Refresh numbers from project data</Button><Button variant="dark" onClick={save} busy={act.busy}>Save record</Button></>}
      />
      {r.ai_drafted && <div className="mb-5"><Notice tone="sky">Parts of this draft were generated from project data. Saving after your edits removes the “AI-drafted” label.</Notice></div>}
      <ErrorNote>{act.error}</ErrorNote>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="The story">
            <div className="space-y-4">
              <Field label="Title" id="re-t"><Input id="re-t" value={r.title} onChange={(e) => set('title', e.target.value)} /></Field>
              <Field label="One-sentence summary" id="re-s" hint="What you did and what changed, with the numbers."><Textarea id="re-s" rows={2} value={r.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
              <Field label="The problem" id="re-p"><Textarea id="re-p" rows={3} value={r.problem} onChange={(e) => set('problem', e.target.value)} /></Field>
              <Field label="What you did" id="re-i"><Textarea id="re-i" rows={5} value={r.intervention} onChange={(e) => set('intervention', e.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Timeline" id="re-tl"><Input id="re-tl" value={r.timeline} onChange={(e) => set('timeline', e.target.value)} /></Field>
                <Field label="Category" id="re-c"><Select id="re-c" value={r.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              </div>
              <Field label="Budget" id="re-b"><Input id="re-b" value={r.budget_summary} onChange={(e) => set('budget_summary', e.target.value)} /></Field>
              <Field label="What you would do differently" id="re-l" hint="The most useful paragraph in the record. Be specific."><Textarea id="re-l" rows={4} value={r.lessons} onChange={(e) => set('lessons', e.target.value)} /></Field>
            </div>
          </Panel>

          <Panel title="Outcomes">
            <div className="space-y-2">
              {r.outcomes.map((o, i) => (
                <div key={o.metric_code} className="grid grid-cols-[1fr_90px_90px_60px] items-center gap-2 text-sm">
                  <span className="font-bold">{metricByCode(o.metric_code)?.name}</span>
                  <Input aria-label="Baseline" inputMode="decimal" value={o.baseline} onChange={(e) => set('outcomes', r.outcomes.map((x, j) => (j === i ? { ...x, baseline: Number(e.target.value) || 0 } : x)))} />
                  <Input aria-label="Result" inputMode="decimal" value={o.result} onChange={(e) => set('outcomes', r.outcomes.map((x, j) => (j === i ? { ...x, result: Number(e.target.value) || 0 } : x)))} />
                  <span className="text-ink-mute">T{o.tier}</span>
                </div>
              ))}
              {!r.outcomes.length && <p className="text-sm text-ink-mute">No outcomes yet. Use “Refresh numbers from project data”.</p>}
            </div>
            <p className="mt-3 text-xs text-ink-mute">Tiers come from verification and cannot be raised here.</p>
          </Panel>

          <Panel title="Obstacles">
            <div className="space-y-2">
              {r.obstacles.map((o, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                  <Select aria-label="Type" value={o.category} onChange={(e) => set('obstacles', r.obstacles.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))}>{OBSTACLE_TAXONOMY.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select>
                  <Input aria-label="Note" value={o.note} onChange={(e) => set('obstacles', r.obstacles.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
                  <button aria-label="Remove" className="p-2 text-ink-mute hover:text-alert" onClick={() => set('obstacles', r.obstacles.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => set('obstacles', [...r.obstacles, { category: 'approval', note: '' }])}><Plus className="h-4 w-4" /> Add obstacle</Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Outcome class">
            <div className="space-y-2" role="radiogroup" aria-label="Outcome class">
              {(Object.keys(OUTCOMES) as OutcomeClass[]).map((k) => (
                <label key={k} className={cx('flex cursor-pointer items-start gap-3 rounded-field border p-3', r.outcome_class === k ? 'border-ink bg-paper' : 'border-paper-line')}>
                  <input type="radio" name="oc" checked={r.outcome_class === k} onChange={() => set('outcome_class', k)} className="mt-1 accent-leaf" />
                  <span><span className="font-bold">{OUTCOMES[k].label}</span><span className="block text-sm text-ink-mute">{OUTCOMES[k].blurb}</span></span>
                </label>
              ))}
            </div>
          </Panel>
          <Panel title="Materials others can reuse">
            <div className="space-y-2">
              {r.materials.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_auto] gap-2">
                  <Input aria-label="Name" value={m.name} onChange={(e) => set('materials', r.materials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <Input aria-label="Kind" value={m.kind} onChange={(e) => set('materials', r.materials.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))} />
                  <button aria-label="Remove" className="p-2 text-ink-mute hover:text-alert" onClick={() => set('materials', r.materials.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => set('materials', [...r.materials, { name: '', kind: 'Template' }])}><Plus className="h-4 w-4" /> Add material</Button>
            </div>
          </Panel>
          <Panel title="Privacy">
            <div className="space-y-3">
              <Checkbox checked={r.anonymised} onChange={(v) => set('anonymised', v)} label="Hide our school’s name" hint={`Readers see: ${r.context.descriptor}`} />
              <p className="text-sm text-ink-mute">Contributors are listed by role: {r.contributors.join('; ') || 'none yet'}.</p>
              <p className="text-sm text-ink-mute">Publishing is done by the faculty liaison from the project’s Record tab.</p>
            </div>
          </Panel>
          {r.project_id && <Link to={`/app/projects/${r.project_id}?tab=record`} className="block text-sm font-bold text-ink-mute hover:text-ink">Back to the project</Link>}
        </div>
      </div>
    </div>
  );
}
