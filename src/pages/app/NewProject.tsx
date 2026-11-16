import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProject, membersOf } from '@/lib/api';
import { fireConfetti } from '@/components/confetti';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import type { ProjectScope } from '@/lib/types';
import { CATEGORIES, TEMPLATES, metricByCode, type ProjectTemplate } from '@/lib/ekoa';
import { Check, Droplets, Leaf, Pencil, Recycle, Sprout, Zap } from 'lucide-react';
import { Badge, Button, ErrorNote, Field, Input, PageHeader, Select, Textarea, cx } from '@/components/ui';

const ICONS: Record<string, typeof Leaf> = { Waste: Recycle, Energy: Zap, Water: Droplets, Food: Sprout, Biodiversity: Leaf };

/** A numbered section heading in the form panel. */
function Step({ n, children }: { n: number; children: string }) {
  return <h3 className="flex items-center gap-2.5 font-display text-lg font-semibold text-ink"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-moss font-sans text-sm font-bold text-paper">{n}</span>{children}</h3>;
}

export default function NewProject() {
  const auth = useAuth();
  const nav = useNavigate();
  const [tpl, setTpl] = useState<ProjectTemplate | null>(TEMPLATES[0]);
  const [title, setTitle] = useState(TEMPLATES[0].name);
  const [category, setCategory] = useState<string>(TEMPLATES[0].category);
  const [description, setDescription] = useState('');
  const [problem, setProblem] = useState('');
  const act = useAction();
  const [scope, setScope] = useState<ProjectScope>('individual');
  const [successor, setSuccessor] = useState('');
  const [lead, setLead] = useState('');
  const { data: members } = useData(() => membersOf(auth.activeOrg!.id), [auth.activeOrg?.id]);
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
      if (!description.trim()) throw new Error('Add a short description of what the project is.');
      if (scope === 'individual' && isTeacher && !lead) throw new Error('Choose the student who leads this project.');
      // No teacher is needed to start. If a teacher starts it for a student, they are the one who verifies it.
      const p = await createProject(auth.activeOrg!.id, {
        title: title.trim(), category, template_key: tpl?.key ?? null, solution: description.trim(), problem: problem.trim(),
        ...(scope === 'individual' ? { scope, lead_person_id: leadId, mentor_person_id: isTeacher ? auth.person!.id : null, successor_person_id: successor || null } : {}),
      }, auth.person!.id);
      fireConfetti();
      nav(`/app/projects/${p.id}`);
    });
  };

  return (
    <div>
      <PageHeader title="Start a project" lead={<>Pick a starter, or begin with your own idea. You get a to-do list and a project page straight away. Or <Link to="/app/library" className="font-bold text-leaf-600 underline">copy a project another school has done</Link>.</>} />
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => pick(t)} aria-pressed={tpl?.key === t.key} className={cx('flex flex-col justify-start rounded-panel border bg-white p-5 text-left transition-colors', tpl?.key === t.key ? 'border-leaf bg-leaf-50 ring-2 ring-leaf/25' : 'border-paper-line hover:border-leaf/60')}>
              <div className="flex w-full items-start gap-3">
                <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tpl?.key === t.key ? 'bg-leaf text-white' : 'bg-leaf-100 text-leaf-600')}>{(() => { const I = ICONS[t.category] ?? Leaf; return <I className="h-5 w-5" aria-hidden />; })()}</span>
                <h2 className="min-w-0 flex-1 font-display text-lg font-semibold leading-snug">{t.name}</h2>
                {t.phase === 'phase2' && <Badge tone="sky" className="shrink-0 whitespace-nowrap">Cohort 2</Badge>}
                {tpl?.key === t.key && <Check className="h-5 w-5 shrink-0 text-leaf-600" aria-label="Selected" />}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{t.summary}</p>
              <p className="mt-3 text-xs text-ink-mute">Measures: {t.metrics.map((m) => metricByCode(m)?.name).join(', ')}</p>
            </button>
          ))}
          <button type="button" onClick={() => pick(null)} aria-pressed={tpl === null} className={cx('flex flex-col justify-start rounded-panel border border-dashed bg-white p-5 text-left', tpl === null ? 'border-leaf bg-leaf-50 ring-2 ring-leaf/25' : 'border-paper-line hover:border-leaf/60')}>
            <div className="flex w-full items-start gap-3">
              <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tpl === null ? 'bg-leaf text-white' : 'bg-clay-100 text-clay-700')}><Pencil className="h-5 w-5" aria-hidden /></span>
              <h2 className="min-w-0 flex-1 font-display text-lg font-semibold leading-snug">Blank project</h2>
              {tpl === null && <Check className="h-5 w-5 shrink-0 text-leaf-600" aria-label="Selected" />}
            </div>
            <p className="mt-2 text-sm text-ink-soft">Your own idea. Name it, describe it, and choose what to measure later.</p>
          </button>
        </div>

        <form className="h-fit space-y-5 rounded-panel border border-paper-line bg-white p-6 shadow-[0_2px_0_rgba(78,93,70,0.10)] lg:sticky lg:top-6" onSubmit={submit}>
          <fieldset>
            <legend className="mb-3"><Step n={1}>Who is doing this project?</Step></legend>
            <div className="grid grid-cols-2 gap-2">
              {([['individual', 'Just me', 'You lead it', canSolo], ['school', 'My group', 'A team shares it', canGroup]] as const).map(([k, l, d, ok]) => (
                <button type="button" key={k} disabled={!ok} onClick={() => setScope(k)} aria-pressed={scope === k} className={cx('rounded-field border p-3 text-left disabled:opacity-60', scope === k ? 'border-leaf bg-leaf-50 ring-2 ring-leaf/25' : 'border-paper-line hover:border-leaf/60')}>
                  <span className="block text-sm font-bold">{l}</span><span className="block text-xs text-ink-mute">{d}</span>
                </button>
              ))}
            </div>
            {scope === 'individual' && isTeacher && (
              <div className="mt-3"><Field label="Student lead" id="np-lead"><Select id="np-lead" value={lead} onChange={(e) => setLead(e.target.value)}><option value="">Choose a student</option>{students.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</Select></Field></div>
            )}
            <p className="mt-2 text-xs text-ink-mute">Your teacher verifies your project when you want to move to the next stage or publish it. You can add them any time, so you can start right now.</p>
          </fieldset>

          <Step n={2}>Your idea</Step>
          <Field label="Project name" id="np-title"><Input id="np-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: Cut canteen waste" /></Field>
          {tpl === null && <Field label="Category" id="np-cat"><Select id="np-cat" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>}
          <Field label="Short description (required)" id="np-desc" hint="What is the project, in a sentence or two?">
            <Textarea id="np-desc" required aria-required="true" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <Field label="Why it matters (optional)" id="np-problem" hint={tpl?.problemPrompt ?? 'What is going wrong, or why should anyone care? You can add this later.'}>
            <Textarea id="np-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={2} />
          </Field>

          <div className="space-y-3 rounded-field border border-sage/40 bg-sage-100/60 p-4">
            <Step n={3}>Make it last</Step>
            <p className="text-sm text-ink-soft">Good projects outlive the students who start them. Other schools can copy yours when it ends, and a future student can take it over.</p>
            {scope === 'individual' ? (
              <Field label="Who could carry it on after you?" id="np-succ"><Select id="np-succ" value={successor} onChange={(e) => setSuccessor(e.target.value)}><option value="">Nobody yet</option>{students.filter((p) => p.id !== leadId).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</Select></Field>
            ) : (
              <p className="text-sm text-ink-soft">A group project is handed on through the Handover page: when a term nears its end, the outgoing lead, the incoming lead and your faculty liaison sign a packet.</p>
            )}
          </div>

          {tpl && (
            <div className="rounded-field bg-leaf-50 p-3 text-sm text-ink-soft">
              <p className="font-bold text-ink">This starter adds</p>
              <p>{tpl.tasks.length} tasks, {tpl.metrics.length} metrics, a monitoring plan and {tpl.risks.length} known {tpl.risks.length === 1 ? 'risk' : 'risks'}.</p>
            </div>
          )}
          <ErrorNote>{act.error}</ErrorNote>
          {!canCreate && <p className="text-sm text-ink-mute">{scope === 'school' ? 'Only board members, the Ekoa Representative and the faculty liaison can start a group project. You can start one on your own.' : 'You need a student role at your school to start a project.'}</p>}
          <Button type="submit" variant="dark" busy={act.busy} disabled={!canCreate} className="w-full">Start project</Button>
        </form>
      </div>
    </div>
  );
}
