import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ListChecks, MessagesSquare, ShieldCheck, Sprout, Users } from 'lucide-react';
import { membersOf, updateProject } from '@/lib/api';
import { useAction, useData } from '@/lib/hooks';
import { TIERS } from '@/lib/ekoa';
import { relative } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import { Button, ErrorNote, Field, Panel, Select, Textarea, cx } from '@/components/ui';
import type { Tier } from '@/lib/types';
import { QuickAddTask, TaskRow } from './TasksTab';
import { useProjectChat } from './ChatTab';
import { useCommunity } from './CommunityTab';

/** The first screen of a project: what we are doing, what is next, who is talking, who else is doing this. */
const NEXT_TIER: Record<Tier, string> = {
  0: 'Attach a photo or file to your results to reach T1.',
  1: 'Ask your faculty liaison to check the results for T2.',
  2: 'Request a peer audit from an Ekoa audit school for T3.',
  3: 'A partner organisation can verify for T4.',
  4: 'Fully verified. Other schools can rely on these results.',
};

export function HomeTab({ b, canEdit, onChange, go, people }: { b: ProjectBundle; canEdit: boolean; onChange: () => void; go: (tab: string) => void; people: Record<string, string> }) {
  const [problem, setProblem] = useState(b.project.problem);
  const [solution, setSolution] = useState(b.project.solution);
  const dirty = problem !== b.project.problem || solution !== b.project.solution;
  const act = useAction();
  const chat = useProjectChat(b.project.id);
  const community = useCommunity(b);
  const open = b.tasks.filter((t) => t.status !== 'done');
  const solo = b.project.scope === 'individual';
  const { data: members } = useData(() => membersOf(b.project.org_id), [b.project.org_id]);
  const students = [...new Map((members ?? []).filter((m) => m.person.is_minor || ['project_lead', 'implementation_team', 'board_member'].includes(m.role.role)).map((m) => [m.person.id, m.person])).values()].filter((p) => p.id !== b.project.lead_person_id);
  const handover = b.handovers.find((h) => h.role === 'project_lead');
  const tier = (b.record?.tier ?? 0) as Tier;
  const last = chat.data?.posts.filter((p) => !p.hidden).slice(-1)[0];
  const examples = community.data?.examples.length ?? 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Panel title="What we are doing">
          <div className="space-y-4">
            <Field label="Why does this matter?" id="h-why" hint="What is going wrong, and how do you know? A sentence or two is plenty.">
              <Textarea id="h-why" rows={3} disabled={!canEdit} value={problem} onChange={(e) => setProblem(e.target.value)} />
            </Field>
            <Field label="What will we do about it?" id="h-do" hint="Say what, who and where. You can change this as you learn.">
              <Textarea id="h-do" rows={3} disabled={!canEdit} value={solution} onChange={(e) => setSolution(e.target.value)} />
            </Field>
            <ErrorNote>{act.error}</ErrorNote>
            {canEdit && dirty && <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { await updateProject(b.project.id, { problem, solution }); onChange(); })}>Save</Button>}
          </div>
        </Panel>

        <Panel title="Next up" action={<button className="text-sm font-bold text-leaf-600 hover:underline" onClick={() => go('tasks')}>All to-dos ({open.length})</button>}>
          <div className="space-y-3">
            <ul className="space-y-2">
              {open.slice(0, 5).map((t) => <TaskRow key={t.id} t={t} canEdit={canEdit} onChange={onChange} />)}
              {!open.length && <li className="text-sm text-ink-soft">{b.tasks.length ? 'All done. Add what comes next.' : 'Add your first to-do below.'}</li>}
            </ul>
            <QuickAddTask b={b} canEdit={canEdit} onChange={onChange} />
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Keeping it going" action={<Sprout className="h-4 w-4 text-ink-mute" aria-hidden />}>
          <p className="text-sm text-ink-soft">Projects should outlast the students who start them.</p>
          {solo ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink-mute">Led by</dt><dd className="font-bold">{people[b.project.lead_person_id ?? ''] ?? 'a student'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-mute">Mentor</dt><dd className="font-bold">{people[b.project.mentor_person_id ?? ''] ?? 'a teacher'}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-ink-mute">Carries it on</dt>
                <dd className="font-bold">{canEdit ? (
                  <Select aria-label="Who carries this project on" className="py-1 text-sm" value={b.project.successor_person_id ?? ''} onChange={(e) => act.run(async () => { await updateProject(b.project.id, { successor_person_id: e.target.value || null }); onChange(); })}>
                    <option value="">Nobody yet</option>{students.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                  </Select>
                ) : people[b.project.successor_person_id ?? ''] ?? 'Nobody yet'}</dd></div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">{handover ? `Handover ${handover.signed_liaison_at ? 'signed' : 'in progress'}.` : 'No handover yet. It starts about eight weeks before a term ends.'}</p>
          )}
          <p className="mt-3 text-sm"><Link to="/app/handover" className="font-bold text-leaf-600 hover:underline">Handover packets</Link></p>
        </Panel>

        <Panel title="Checked by others" action={<ShieldCheck className="h-4 w-4 text-ink-mute" aria-hidden />}>
          <ol className="space-y-1.5" aria-label="Verification levels">
            {([0, 1, 2, 3, 4] as Tier[]).map((n) => (
              <li key={n} className={cx('flex items-center gap-2 text-sm', n <= tier ? 'font-bold text-ink' : 'text-ink-mute')}>
                {n <= tier ? <Check className="h-4 w-4 text-leaf-600" aria-hidden /> : <span className="h-4 w-4 rounded-full border border-paper-line" aria-hidden />}
                {TIERS[n].label}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-ink-soft">{b.record ? NEXT_TIER[tier] : 'Your results start as T0 and become more trusted as teachers and other schools check them. Start your record on the Record tab when you have results.'}</p>
          <p className="mt-3 text-sm"><button className="font-bold text-leaf-600 hover:underline" onClick={() => go('record')}>Open the record</button></p>
        </Panel>

        <Panel title="Team chat" action={<MessagesSquare className="h-4 w-4 text-ink-mute" aria-hidden />}>
          {last ? (
            <p className="text-sm text-ink-soft"><span className="font-bold text-ink">{last.author_name}</span> <span className="text-ink-mute">{relative(last.created_at)}</span><span className="mt-1 line-clamp-3 block text-ink">{last.body}</span></p>
          ) : <p className="text-sm text-ink-soft">Talk with your team here. Ask a question, share a photo idea, or say what you tried today.</p>}
          <Button variant="ghost" className="mt-3" onClick={() => go('chat')}>Open the chat <ArrowRight className="h-4 w-4" /></Button>
        </Panel>

        <Panel title="Community" action={<Users className="h-4 w-4 text-ink-mute" aria-hidden />}>
          <p className="text-sm text-ink-soft">{community.data?.circle ? `Join the ${community.data.circle.name} circle to ask other students for help.` : 'See what other schools did.'} {examples > 0 && `${examples} similar ${examples === 1 ? 'project' : 'projects'} to learn from.`}</p>
          <Button variant="ghost" className="mt-3" onClick={() => go('community')}>See the community <ArrowRight className="h-4 w-4" /></Button>
        </Panel>

        <Panel title="Your workspace" action={<ListChecks className="h-4 w-4 text-ink-mute" aria-hidden />}>
          <ul className="space-y-1.5 text-sm">
            {([['plan', 'Plan and budget'], ['measures', 'Measurements'], ['evidence', 'Photos and evidence'], ['obstacles', 'What got in the way'], ['approvals', 'Approvals'], ['record', 'The record other schools will read']] as const).map(([k, l]) => (
              <li key={k}><button className="font-bold text-leaf-600 hover:underline" onClick={() => go(k)}>{l}</button></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-mute">Other schools will be able to build on what you write down, so keep notes as you go. <Link to="/app/library" className="font-bold underline">See examples</Link></p>
        </Panel>
      </div>
    </div>
  );
}
