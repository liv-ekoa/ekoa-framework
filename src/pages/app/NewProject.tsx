import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProject, membersOf } from '@/lib/api';
import { fireConfetti } from '@/components/confetti';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import type { ProjectScope } from '@/lib/types';
import { CATEGORIES, TEMPLATES, type ProjectTemplate } from '@/lib/ekoa';
import { Button, ErrorNote, Field, Input, PageHeader, Select, Textarea, cx } from '@/components/ui';

export default function NewProject() {
  const auth = useAuth();
  const nav = useNavigate();
  const [tpl, setTpl] = useState<ProjectTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Waste');
  const [description, setDescription] = useState('');
  const [problem, setProblem] = useState('');
  const act = useAction();
  const [scope, setScope] = useState<ProjectScope>('individual');
  const [mentor, setMentor] = useState('');
  const [successor, setSuccessor] = useState('');
  const [lead, setLead] = useState('');
  const { data: members } = useData(() => membersOf(auth.activeOrg!.id), [auth.activeOrg?.id]);
  const teachers = (members ?? []).filter((m) => m.role.role === 'faculty_liaison' && !m.person.is_minor && ['active', 'outgoing'].includes(m.role.status));
  const students = [...new Map((members ?? []).filter((m) => m.person.is_minor || ['project_lead', 'implementation_team', 'board_member'].includes(m.role.role)).map((m) => [m.person.id, m.person])).values()];
  const isTeacher = auth.has(['faculty_liaison']);
  const leadId = isTeacher && lead ? lead : auth.person!.id;
  const canSolo = auth.has(['project_lead', 'board_member', 'implementation_team', 'faculty_liaison', 'ekoa_rep']);
  const canGroup = auth.has(['project_lead', 'board_member', 'faculty_liaison', 'ekoa_rep']);
  const canCreate = scope === 'individual' ? canSolo : canGroup;

  // A starter is optional: it only adds a name and a ready-made to-do list and measures.
  const pick = (t: ProjectTemplate | null) => {
    setTpl(t);
    setTitle(t ? t.name : '');
    if (t) setCategory(t.category);
    if (!t) setTimeout(() => document.getElementById('np-title')?.focus(), 0);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void act.run(async () => {
      if (!title.trim()) throw new Error('Give the project a name.');
      if (!description.trim()) throw new Error('Add a short description of what the project is.');
      if (scope === 'individual' && isTeacher && !lead) throw new Error('Choose the student who leads this project.');
      const p = await createProject(auth.activeOrg!.id, { title: title.trim(), category, template_key: tpl?.key ?? null, solution: description.trim(), problem: problem.trim(), ...(scope === 'individual' ? { scope, lead_person_id: leadId, mentor_person_id: mentor || null, successor_person_id: successor || null } : {}) }, auth.person!.id);
      fireConfetti();
      nav(`/app/projects/${p.id}`);
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Start a project" lead={<>Three quick steps. You get a to-do list and a project page straight away. Or <Link to="/app/library" className="font-bold text-leaf-600 underline">copy a project another school has done</Link>.</>} />
      <form onSubmit={submit} className="space-y-8">
        <section aria-labelledby="np-s1" className="space-y-3">
          <h2 id="np-s1" className="text-xl font-semibold"><span className="mr-2 text-ink-mute">1</span>Who is doing this project?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['individual', 'Just me', 'You lead it on your own.', canSolo],
              ['school', 'My group', 'A team shares one project. To-dos belong to roles, so the group can change over time.', canGroup],
            ] as const).map(([k, l, d, ok]) => (
              <button type="button" key={k} disabled={!ok} onClick={() => setScope(k)} aria-pressed={scope === k} className={cx('rounded-panel border bg-white p-4 text-left disabled:opacity-60', scope === k ? 'border-ink ring-2 ring-ink/10' : 'border-paper-line hover:border-ink/40')}>
                <span className="block font-display text-lg font-semibold">{l}</span><span className="mt-1 block text-sm text-ink-soft">{d}</span>
                {!ok && <span className="mt-1 block text-xs text-ink-mute">Ask your faculty liaison to start group projects, or start one on your own.</span>}
              </button>
            ))}
          </div>
          <div className="space-y-4 rounded-field bg-paper p-4">
            <p className="text-sm text-ink-soft"><span className="font-bold text-ink">Your teacher verifies your project. </span>They check your results at each stage, which is what lets other schools trust them.</p>
            {scope === 'individual' ? (
              <>
                {isTeacher && <Field label="Student lead" id="np-lead"><Select id="np-lead" value={lead} onChange={(e) => setLead(e.target.value)}><option value="">Choose a student</option>{students.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</Select></Field>}
                <Field label="Teacher who will verify it (optional for now)" id="np-mentor" hint="You can start now and choose your teacher later on the project page. You will need one before you move on from the first stage."><Select id="np-mentor" value={mentor} onChange={(e) => setMentor(e.target.value)}><option value="">Choose later</option>{teachers.map((m) => <option key={m.person.id} value={m.person.id}>{m.person.display_name}</option>)}</Select></Field>
              </>
            ) : <p className="text-sm text-ink-soft">For a group project this is your school's faculty liaison.</p>}
          </div>
        </section>

        <section aria-labelledby="np-s2" className="space-y-4">
          <h2 id="np-s2" className="text-xl font-semibold"><span className="mr-2 text-ink-mute">2</span>What are you working on?</h2>
          <Field label="Project name" id="np-title"><Input id="np-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: Cut canteen waste" /></Field>
          <Field label="Short description (required)" id="np-desc" hint="What is the project, in a sentence or two?">
            <Textarea id="np-desc" required aria-required="true" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <Field label="Why it matters (optional)" id="np-problem" hint={tpl?.problemPrompt ?? 'What is going wrong, or why should anyone care? You can add this later.'}>
            <Textarea id="np-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={2} />
          </Field>
          {tpl === null && <Field label="What is it about?" id="np-cat"><Select id="np-cat" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>}
          <div>
            <p className="text-sm font-bold text-ink">Need an idea? Start from an example (optional)</p>
            <p className="text-sm text-ink-mute">An example adds a ready-made to-do list and the things to measure. You can change all of it.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button type="button" key={t.key} onClick={() => pick(tpl?.key === t.key ? null : t)} aria-pressed={tpl?.key === t.key} title={t.summary} className={cx('rounded-full border px-3 py-1.5 text-sm font-bold', tpl?.key === t.key ? 'border-ink bg-paper-deep' : 'border-paper-line bg-white hover:border-ink/40')}>
                  {t.name}{t.phase === 'phase2' && <span className="ml-1.5 text-xs font-normal text-sky">Cohort 2</span>}
                </button>
              ))}
              <button type="button" onClick={() => pick(null)} aria-pressed={tpl === null} className={cx('rounded-full border border-dashed px-3 py-1.5 text-sm font-bold', tpl === null ? 'border-ink bg-paper-deep' : 'border-paper-line bg-white hover:border-ink/40')}>My own idea</button>
            </div>
          </div>
        </section>

        <section aria-labelledby="np-s3" className="space-y-3">
          <h2 id="np-s3" className="text-xl font-semibold"><span className="mr-2 text-ink-mute">3</span>Make it last</h2>
          <p className="max-w-prose text-sm text-ink-soft">Good projects outlive the students who start them. Other schools can copy yours when it ends, and a future student can take it over.</p>
          {scope === 'individual' ? (
            <Field label="Who could carry it on after you?" id="np-succ" hint="“Nobody yet” is fine. You can pick a student any time on the project page."><Select id="np-succ" value={successor} onChange={(e) => setSuccessor(e.target.value)}><option value="">Nobody yet</option>{students.filter((p) => p.id !== leadId).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</Select></Field>
          ) : (
            <p className="rounded-field bg-paper px-4 py-3 text-sm text-ink-soft">A group project is handed on through the Handover page: when a term nears its end, the outgoing lead, the incoming lead and your faculty liaison sign a packet. You can also name a co-lead at any time.</p>
          )}
        </section>

        <div className="space-y-3 border-t border-paper-line pt-6">
          <ErrorNote>{act.error}</ErrorNote>
          {!canCreate && <p className="text-sm text-ink-mute">{scope === 'school' ? 'Only board members, the Ekoa Representative and the faculty liaison can start a group project. You can start one on your own.' : 'You need a student role at your school to start a project.'}</p>}
          <Button type="submit" variant="dark" busy={act.busy} disabled={!canCreate} className="w-full sm:w-auto">Start project</Button>
          {tpl && <p className="text-sm text-ink-mute">Adds {tpl.tasks.length} to-dos, {tpl.metrics.length} things to measure and {tpl.risks.length} known {tpl.risks.length === 1 ? 'risk' : 'risks'} to watch.</p>}
        </div>
      </form>
    </div>
  );
}
