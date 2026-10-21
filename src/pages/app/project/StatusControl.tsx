import { useState } from 'react';
import { addObstacle, saveRecord, setProjectStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { OBSTACLE_TAXONOMY, STAGES } from '@/lib/ekoa';
import { draftRecord } from '@/lib/ai';
import type { ProjectBundle } from '@/lib/bundle';
import type { ProjectStatus } from '@/lib/types';
import { Button, ErrorNote, Field, Modal, Notice, Select, Textarea } from '@/components/ui';

/** Changing a project to Stalled or Ended runs a blameless post-mortem, so failure becomes a record instead of a disappearance. */
export function StatusControl({ b, onChange }: { b: ProjectBundle; onChange: () => void }) {
  const auth = useAuth();
  const [next, setNext] = useState<ProjectStatus | null>(null);
  const [pm, setPm] = useState({ tried: '', stage: b.project.stage as string, step: '', category: 'monitoring', cause: '', differently: '', reusable: '' });
  const act = useAction();
  const s = b.project.status;
  const needsPostMortem = next === 'stalled' || next === 'ended';

  const confirm = () =>
    act.run(async () => {
      if (needsPostMortem) {
        if (pm.tried.trim().length < 10 || pm.cause.trim().length < 10 || pm.differently.trim().length < 10) throw new Error('Answer what you tried, the root cause and what you would do differently. A sentence each is enough.');
        await addObstacle({
          project_id: b.project.id, stage: pm.stage as ProjectBundle['project']['stage'], category: pm.category, subcategory: pm.step ? `Stalled at ${pm.step}` : '',
          severity: 'blocked', started_on: new Date().toISOString().slice(0, 10), resolved_on: null, resolution: '', description: pm.cause,
        });
      }
      if (next === 'ended') {
        const draft = await draftRecord(b);
        await saveRecord({
          ...(b.record ? { id: b.record.id } : {}),
          ...draft,
          org_id: b.project.org_id,
          project_id: b.project.id,
          context: { ...b.org.context_profile!, country: b.org.country, city: b.org.city, descriptor: b.org.anonymised_label ?? '' },
          outcome_class: 'did_not_work',
          tier: 2,
          intervention: pm.tried,
          lessons: pm.differently + (pm.reusable ? ` Reusable: ${pm.reusable}` : ''),
          obstacles: [...(draft.obstacles ?? []), { category: pm.category, note: pm.cause }],
          status: 'in_review',
          visibility: 'school',
          anonymised: true,
          contributors: ['Project Lead', 'Faculty Liaison'],
          materials: [{ name: 'Post-mortem notes', kind: 'Post-mortem' }],
          ai_drafted: false,
        });
      }
      await setProjectStatus(b.project, next!, auth.person!.id);
      setNext(null);
      onChange();
    });

  return (
    <>
      <Select aria-label="Project status" value="" onChange={(e) => e.target.value && setNext(e.target.value as ProjectStatus)} className="w-auto py-1.5 text-sm">
        <option value="">Change status</option>
        {s !== 'active' && <option value="active">Resume (active)</option>}
        {s === 'active' && <option value="paused">Pause</option>}
        {s !== 'stalled' && s !== 'ended' && <option value="stalled">Mark as stalled</option>}
        {s !== 'ended' && <option value="ended">End the project</option>}
        {s !== 'completed' && b.project.stage === 'scale' && <option value="completed">Mark completed</option>}
      </Select>
      <Modal open={!!next} onClose={() => setNext(null)} title={needsPostMortem ? (next === 'ended' ? 'End the project: post-mortem' : 'Mark as stalled: what happened?') : 'Change status'} wide={needsPostMortem}>
        <div className="space-y-4">
          {needsPostMortem ? (
            <>
              <Notice tone="lesson">This is blameless. Describe what the system did, not who failed. Your faculty liaison removes names before anything is shared, and an ended project becomes a “did not work” record for review.</Notice>
              <Field label="What did you try?" id="pm-tried"><Textarea id="pm-tried" rows={3} value={pm.tried} onChange={(e) => setPm({ ...pm, tried: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Where did it stop?" id="pm-stage">
                  <Select id="pm-stage" value={pm.stage} onChange={(e) => setPm({ ...pm, stage: e.target.value })}>{STAGES.map((st) => <option key={st.key} value={st.key}>{st.name}</option>)}</Select>
                </Field>
                <Field label="Approval step, if any" id="pm-step">
                  <Select id="pm-step" value={pm.step} onChange={(e) => setPm({ ...pm, step: e.target.value })}><option value="">Not an approval step</option>{b.steps.map((st) => <option key={st.id}>{st.body}</option>)}</Select>
                </Field>
                <Field label="Obstacle type" id="pm-cat">
                  <Select id="pm-cat" value={pm.category} onChange={(e) => setPm({ ...pm, category: e.target.value })}>{OBSTACLE_TAXONOMY.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</Select>
                </Field>
              </div>
              <Field label="Root cause" id="pm-cause" hint="Ask “why” until you reach something the school could change."><Textarea id="pm-cause" rows={3} value={pm.cause} onChange={(e) => setPm({ ...pm, cause: e.target.value })} /></Field>
              <Field label="What would you do differently?" id="pm-diff"><Textarea id="pm-diff" rows={3} value={pm.differently} onChange={(e) => setPm({ ...pm, differently: e.target.value })} /></Field>
              <Field label="What is reusable?" id="pm-reuse" hint="Templates, signage, contacts by role, data."><Textarea id="pm-reuse" rows={2} value={pm.reusable} onChange={(e) => setPm({ ...pm, reusable: e.target.value })} /></Field>
            </>
          ) : (
            <p className="text-ink-soft">Change the project status to <strong>{next}</strong>?</p>
          )}
          <ErrorNote>{act.error}</ErrorNote>
          <div className="flex gap-2">
            <Button variant="dark" busy={act.busy} onClick={confirm}>{next === 'ended' ? 'End project and draft the record' : next === 'stalled' ? 'Save and mark stalled' : 'Change status'}</Button>
            <Button variant="quiet" onClick={() => setNext(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
