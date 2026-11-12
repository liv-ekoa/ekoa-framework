import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProject, membersOf } from '@/lib/api';
import { fireConfetti } from '@/components/confetti';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import type { ProjectScope } from '@/lib/types';
import { CATEGORIES, TEMPLATES, type ProjectTemplate } from '@/lib/ekoa';
import { Badge, Button, ErrorNote, Field, Input, PageHeader, Select, Textarea, cx } from '@/components/ui';

export default function NewProject() {
  const auth = useAuth();
  const nav = useNavigate();
  const [tpl, setTpl] = useState<ProjectTemplate | null>(TEMPLATES[0]);
  const [title, setTitle] = useState(TEMPLATES[0].name);
  const [category, setCategory] = useState<string>(TEMPLATES[0].category);
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

  const pick = (t: ProjectTemplate | null) => {
    setTpl(t);
    setTitle(t ? t.name : '');
    setCategory(t ? t.category : 'Waste');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void act.run(async () => {
      if (!title.trim()) throw new Error('Give the project a name.');
      if (scope === 'individual' && !mentor) throw new Error('Choose the teacher who will mentor this project.');
      if (scope === 'individual' && isTeacher && !lead) throw new Error('Choose the student who leads this project.');
      const p = await createProject(auth.activeOrg!.id, { title: title.trim(), category, template_key: tpl?.key ?? null, problem, ...(scope === 'individual' ? { scope, lead_person_id: leadId, mentor_person_id: mentor, successor_person_id: successor || null } : {}) }, auth.person!.id);
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
              ['individual', 'Just me', 'You lead it. A teacher mentors you and checks your work.', canSolo],
              ['school', 'My group', 'A team shares one project. To-dos belong to roles, so the group can change over time.', canGroup],
            ] as const).map(([k, l, d, ok]) => (
              <button type="button" key={k} disabled={!ok} onClick={() => setScope(k)} aria-pressed={scope === k} className={cx('rounded-panel border bg-white p-4 text-left disabled:opacity-60', scope === k ? 'border-ink ring-2 ring-ink/10' : 'border-paper-line hover:border-ink/40')}>
                <span className="block font-display text-lg font-semibold">{l}</span><span className="mt-1 block text-sm text-ink-soft">{d}</span>
                {!ok && <span className="mt-1 block text-xs text-ink-mute">Ask your faculty liaison to start group projects, or start one on your own.</span>}
              </button>
            ))}
          </div>
          {scope === 'individual' && (
            <div className="space-y-4 rounded-field bg-paper p-4">
              {isTeacher && <Field label="Student lead" id="np-lead"><Select id="np-lead" value={lead} onChange={(e) => setLead(e.target.value)}><option value="">Choose a student</option>{students.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</Select></Field>}
              <Field label="Teacher mentor" id="np-mentor" hint="The teacher who checks in with you and signs off each stage."><Select id="np-mentor" value={mentor} onChange={(e) => setMentor(e.target.value)}><option value="">Choose a teacher</option>{teachers.map((m) => <option key={m.person.id} value={m.person.id}>{m.person.display_name}</option>)}</Select></Field>
            </div>
          )}
        </section>

        <section aria-labelledby="np-s2" className="space-y-4">
          <h2 id="np-s2" className="text-xl font-semibold"><span className="mr-2 text-ink-mute">2</span>What are you working on?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button type="button" key={t.key} onClick={() => pick(t)} aria-pressed={tpl?.key === t.key} className={cx('rounded-panel border bg-white p-4 text-left transition-colors', tpl?.key === t.key ? 'border-ink ring-2 ring-ink/10' : 'border-paper-line hover:border-ink/40')}>
                <span className="flex items-start justify-between gap-2"><span className="font-display text-lg font-semibold">{t.name}</span>{t.phase === 'phase2' && <Badge tone="sky" className="shrink-0 whitespace-nowrap">Cohort 2</Badge>}</span>
                <span className="mt-1 block text-sm text-ink-soft">{t.summary}</span>
              </button>
            ))}
            <button type="button" onClick={() => pick(null)} aria-pressed={tpl === null} className={cx('rounded-panel border border-dashed bg-white p-4 text-left', tpl === null ? 'border-ink ring-2 ring-ink/10' : 'border-paper-line hover:border-ink/40')}>
              <span className="font-display text-lg font-semibold">My own idea</span>
              <span className="mt-1 block text-sm text-ink-soft">Start blank and choose what to measure later.</span>
            </button>
          </div>
          <Field label="Project name" id="np-title"><Input id="np-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          {tpl === null && <Field label="What is it about?" id="np-cat"><Select id="np-cat" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>}
          <Field label="Why does this matter? (optional)" id="np-problem" hint={tpl?.problemPrompt ?? 'One or two sentences. You can write more once you have looked around.'}>
            <Textarea id="np-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={2} />
          </Field>
        </section>

        <section aria-labelledby="np-s3" className="space-y-3">
          <h2 id="np-s3" className="text-xl font-semibold"><span className="mr-2 text-ink-mute">3</span>Make it last</h2>
          <p className="max-w-prose text-sm text-ink-soft">Good projects outlive the students who start them. Other schools can copy yours when it ends, and a future student can take it over. Your results can be checked by your teacher, and by a partner school, which is what makes them trusted.</p>
          {scope === 'individual' ? (
            <Field label="Who could carry it on after you? (optional)" id="np-succ" hint="Name a student now so the work survives graduation. You can change this any time on the project page."><Select id="np-succ" value={successor} onChange={(e) => setSuccessor(e.target.value)}><option value="">Nobody yet</option>{students.filter((p) => p.id !== leadId).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</Select></Field>
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
