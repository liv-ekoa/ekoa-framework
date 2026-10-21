import { useState } from 'react';
import { addObstacle, updateObstacle } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { OBSTACLE_TAXONOMY, STAGES, obstacleLabel } from '@/lib/ekoa';
import { fmtDate, daysBetween } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import type { Obstacle, StageKey } from '@/lib/types';
import { Badge, Button, Empty, ErrorNote, Field, Panel, Select, Textarea } from '@/components/ui';

export function ObstaclesTab({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const [f, setF] = useState({ category: 'approval', subcategory: '', severity: 'delayed' as Obstacle['severity'], stage: b.project.stage as StageKey, description: '' });
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const act = useAction();
  const cat = OBSTACLE_TAXONOMY.find((o) => o.key === f.category)!;
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-3">
        {b.obstacles.length ? b.obstacles.map((o) => (
          <article key={o.id} className="rounded-panel border border-paper-line bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="lesson">{obstacleLabel(o.category)}</Badge>
              {o.subcategory && <span className="text-sm text-ink-mute">{o.subcategory}</span>}
              <Badge tone={o.severity === 'blocked' ? 'alert' : o.severity === 'delayed' ? 'clay' : 'mute'}>{o.severity[0].toUpperCase() + o.severity.slice(1)}</Badge>
              <span className="text-sm text-ink-mute">{STAGES.find((s) => s.key === o.stage)?.name} stage</span>
            </div>
            <p className="mt-3 text-ink">{o.description}</p>
            <p className="mt-2 text-sm text-ink-mute">
              Started {fmtDate(o.started_on)}. {o.resolved_on ? `Resolved after ${daysBetween(o.started_on, o.resolved_on)} days.` : `Open for ${daysBetween(o.started_on)} days.`}
            </p>
            {o.resolution && <p className="mt-2 rounded-field bg-leaf-50 px-3 py-2 text-sm text-ink-soft"><strong>How it was resolved:</strong> {o.resolution}</p>}
            {canEdit && !o.resolved_on && (resolving === o.id ? (
              <div className="mt-3 space-y-2">
                <Textarea aria-label="Resolution" rows={2} placeholder="How was it resolved?" value={resolution} onChange={(e) => setResolution(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" busy={act.busy} onClick={() => act.run(async () => { await updateObstacle(o.id, { resolved_on: new Date().toISOString().slice(0, 10), resolution }); setResolving(null); setResolution(''); onChange(); })}>Mark resolved</Button>
                  <Button size="sm" variant="quiet" onClick={() => setResolving(null)}>Cancel</Button>
                </div>
              </div>
            ) : <Button size="sm" variant="ghost" className="mt-3" onClick={() => setResolving(o.id)}>Record the resolution</Button>)}
          </article>
        )) : <Empty title="No obstacles logged">Log obstacles when they happen, not at the end. Where a project stalled is the most useful thing another school can learn.</Empty>}
      </div>
      {canEdit && (
        <Panel title="Log an obstacle">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void act.run(async () => { if (f.description.trim().length < 10) throw new Error('Describe what happened in a sentence.'); await addObstacle({ project_id: b.project.id, stage: f.stage, category: f.category, subcategory: f.subcategory, severity: f.severity, started_on: new Date().toISOString().slice(0, 10), resolved_on: null, resolution: '', description: f.description.trim() }); setF({ ...f, description: '', subcategory: '' }); onChange(); }); }}>
            <Field label="Type" id="ob-c"><Select id="ob-c" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, subcategory: '' })}>{OBSTACLE_TAXONOMY.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</Select></Field>
            <Field label="Detail" id="ob-s"><Select id="ob-s" value={f.subcategory} onChange={(e) => setF({ ...f, subcategory: e.target.value })}><option value="">Choose one</option>{cat.examples.map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Severity" id="ob-v"><Select id="ob-v" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as Obstacle['severity'] })}><option value="blocked">Blocked</option><option value="delayed">Delayed</option><option value="minor">Minor</option></Select></Field>
              <Field label="Stage" id="ob-st"><Select id="ob-st" value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value as StageKey })}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}</Select></Field>
            </div>
            <Field label="What happened?" id="ob-d"><Textarea id="ob-d" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <ErrorNote>{act.error}</ErrorNote>
            <Button type="submit" busy={act.busy}>Log obstacle</Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
