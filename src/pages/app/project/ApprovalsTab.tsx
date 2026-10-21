import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createProposal, decideStep } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import type { Proposal } from '@/lib/types';
import { Badge, Button, Empty, ErrorNote, Field, Input, Panel, Textarea, cx } from '@/components/ui';

const DAY = 86_400_000;

export function ProposalTimeline({ b, p, canDecide, onChange }: { b: Pick<ProjectBundle, 'steps' | 'events'>; p: Proposal; canDecide: boolean; onChange: () => void }) {
  const auth = useAuth();
  const [notes, setNotes] = useState('');
  const act = useAction();
  const evs = b.events.filter((e) => e.proposal_id === p.id);
  const dayAt = (stepId: string) => {
    const e = [...evs].reverse().find((x) => x.step_id === stepId);
    return e ? Math.round(((e.decided_at ? new Date(e.decided_at).getTime() : Date.now()) - new Date(e.entered_at).getTime()) / DAY) : null;
  };
  // One shared scale for every row, so bar lengths compare across steps.
  const scale = Math.max(1, ...b.steps.map((s) => Math.max(s.typical_days, dayAt(s.id) ?? 0))) * 1.08;
  const total = evs.reduce((a, e) => a + Math.round(((e.decided_at ? new Date(e.decided_at).getTime() : Date.now()) - new Date(e.entered_at).getTime()) / DAY), 0);
  return (
    <div className="rounded-panel border border-paper-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{p.title}</h3>
          <p className="text-sm text-ink-mute">{p.ask}. Submitted {fmtDate(p.submitted_at)}. {total} days {p.decision === 'pending' ? 'so far' : 'in total'}.</p>
        </div>
        <Badge tone={p.decision === 'approved' ? 'leaf' : p.decision === 'rejected' ? 'alert' : 'clay'}>{p.decision === 'pending' ? 'In progress' : p.decision[0].toUpperCase() + p.decision.slice(1)}</Badge>
      </div>
      <ol className="mt-5 grid gap-2" aria-label="Approval steps">
        {b.steps.map((s) => {
          const e = [...evs].reverse().find((x) => x.step_id === s.id);
          const days = e ? Math.round(((e.decided_at ? new Date(e.decided_at).getTime() : Date.now()) - new Date(e.entered_at).getTime()) / DAY) : null;
          const current = p.current_step_id === s.id && p.decision === 'pending';
          const slow = days !== null && days > s.typical_days;
          const width = days !== null ? (days / scale) * 100 : 0;
          return (
            <li key={s.id} className={cx('grid grid-cols-[minmax(8rem,12rem)_1fr_auto] items-center gap-3 rounded-field px-2 py-1.5 text-sm', current && 'bg-clay-100')}>
              <span className={cx('truncate', e ? 'font-bold text-ink' : 'text-ink-mute')}>{s.body}</span>
              <span className="relative h-3 rounded-r-[4px] bg-paper-deep">
                {days !== null && <span className={cx('absolute inset-y-0 left-0 rounded-r-[4px]', slow ? 'bg-clay-600' : 'bg-leaf', current && 'opacity-70')} style={{ width: `${width}%` }} />}
                <span className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: `calc(${(s.typical_days / scale) * 100}% - 1px)` }} aria-hidden />
              </span>
              <span className={cx('w-24 text-right tabular-nums', slow ? 'font-bold text-clay-700' : 'text-ink-soft')}>
                {days === null ? '—' : `${days} d`}{current ? ' so far' : ''}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 flex items-center gap-2 text-xs text-ink-mute"><span className="inline-block h-3 w-0.5 bg-ink" /> Typical time for each step. Amber bars took longer than usual.</p>
      {canDecide && p.decision === 'pending' && (
        <div className="mt-5 space-y-3 border-t border-paper-line pt-4">
          <p className="text-sm font-bold">Record the decision at {b.steps.find((s) => s.id === p.current_step_id)?.body}</p>
          <Textarea aria-label="Decision notes" rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <ErrorNote>{act.error}</ErrorNote>
          <div className="flex flex-wrap gap-2">
            <Button busy={act.busy} onClick={() => act.run(async () => { await decideStep(p, 'passed', notes, auth.person!.id); setNotes(''); onChange(); })}>Passed this step</Button>
            <Button variant="ghost" onClick={() => act.run(async () => { await decideStep(p, 'returned', notes, auth.person!.id); onChange(); })}>Returned for changes</Button>
            <Button variant="danger" onClick={() => act.run(async () => { await decideStep(p, 'rejected', notes, auth.person!.id); onChange(); })}>Rejected</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApprovalsTab({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const auth = useAuth();
  const [title, setTitle] = useState('');
  const [ask, setAsk] = useState('');
  const act = useAction();
  const canDecide = auth.has(['approver', 'faculty_liaison'], b.project.org_id);
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4">
        {b.proposals.length ? b.proposals.map((p) => <ProposalTimeline key={p.id} b={b} p={p} canDecide={canDecide} onChange={onChange} />) : <Empty title="No proposals yet">Submit the proposal here so every step is timed. Delays become evidence, not frustration.</Empty>}
        {canDecide && <p className="text-sm text-ink-mute">In the pilot, the faculty liaison records decisions on behalf of approvers who do not use the platform.</p>}
      </div>
      {canEdit && (
        <Panel title="Submit a proposal">
          {b.steps.length ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void act.run(async () => { if (!title.trim() || !ask.trim()) throw new Error('Add a title and what you are asking for.'); await createProposal(b.project, title.trim(), ask.trim(), auth.person!.id); setTitle(''); setAsk(''); onChange(); }); }}>
              <Field label="Title" id="pr-t"><Input id="pr-t" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <Field label="What are you asking for?" id="pr-a" hint="Money, permission, space or a policy change. Be specific."><Textarea id="pr-a" rows={3} value={ask} onChange={(e) => setAsk(e.target.value)} /></Field>
              <p className="text-sm text-ink-mute">It goes through {b.steps.length} steps, starting with {b.steps[0].body}. Typical total: {b.steps.reduce((a, s) => a + s.typical_days, 0)} days.</p>
              <ErrorNote>{act.error}</ErrorNote>
              <Button type="submit" variant="dark" busy={act.busy}>Submit proposal</Button>
            </form>
          ) : (
            <p className="text-sm text-ink-soft">Your school has no approval chain mapped yet. <Link to="/app/school?tab=governance" className="font-bold text-leaf-600 underline">Map it under My School</Link>.</p>
          )}
        </Panel>
      )}
    </div>
  );
}
