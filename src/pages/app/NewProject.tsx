import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProject } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { CATEGORIES, TEMPLATES, metricByCode, type ProjectTemplate } from '@/lib/ekoa';
import { Badge, Button, ErrorNote, Field, Input, PageHeader, Select, Textarea, cx } from '@/components/ui';

export default function NewProject() {
  const auth = useAuth();
  const nav = useNavigate();
  const [tpl, setTpl] = useState<ProjectTemplate | null>(TEMPLATES[0]);
  const [title, setTitle] = useState(TEMPLATES[0].name);
  const [category, setCategory] = useState<string>(TEMPLATES[0].category);
  const [problem, setProblem] = useState('');
  const act = useAction();
  const canCreate = auth.has(['project_lead', 'board_member', 'faculty_liaison', 'ekoa_rep']);

  const pick = (t: ProjectTemplate | null) => {
    setTpl(t);
    setTitle(t ? t.name : '');
    setCategory(t ? t.category : 'Waste');
  };

  return (
    <div>
      <PageHeader title="Start a project" lead={<>Pick a template, or <Link to="/app/library" className="font-bold text-leaf-600 underline">adapt a record from another school</Link>. Pilot templates are for waste; energy and water templates arrive with Cohort 2.</>} />
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button key={t.key} onClick={() => pick(t)} aria-pressed={tpl?.key === t.key} className={cx('flex flex-col justify-start rounded-panel border bg-white p-5 text-left transition-colors', tpl?.key === t.key ? 'border-ink ring-2 ring-ink/10' : 'border-paper-line hover:border-ink/40')}>
              <div className="flex w-full items-start justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">{t.name}</h2>
                {t.phase === 'phase2' && <Badge tone="sky" className="shrink-0 whitespace-nowrap">Cohort 2</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{t.summary}</p>
              <p className="mt-3 text-xs text-ink-mute">Measures: {t.metrics.map((m) => metricByCode(m)?.name).join(', ')}</p>
            </button>
          ))}
          <button onClick={() => pick(null)} aria-pressed={tpl === null} className={cx('flex flex-col justify-start rounded-panel border border-dashed bg-white p-5 text-left', tpl === null ? 'border-ink' : 'border-paper-line hover:border-ink/40')}>
            <h2 className="font-display text-lg font-semibold">Blank project</h2>
            <p className="mt-1 text-sm text-ink-soft">Choose your own metrics from the library.</p>
          </button>
        </div>
        <form className="h-fit space-y-4 rounded-panel border border-paper-line bg-white p-6 lg:sticky lg:top-6" onSubmit={(e) => { e.preventDefault(); void act.run(async () => { if (!title.trim()) throw new Error('Give the project a name.'); const p = await createProject(auth.activeOrg!.id, { title: title.trim(), category, template_key: tpl?.key ?? null, problem }, auth.person!.id); nav(`/app/projects/${p.id}`); }); }}>
          <Field label="Project name" id="np-title"><Input id="np-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Category" id="np-cat"><Select id="np-cat" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="What problem are you looking at?" id="np-problem" hint={tpl?.problemPrompt ?? 'You can finish this after the baseline audit.'}>
            <Textarea id="np-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} />
          </Field>
          {tpl && (
            <div className="rounded-field bg-paper p-3 text-sm text-ink-soft">
              <p className="font-bold text-ink">This template adds</p>
              <p>{tpl.tasks.length} tasks, {tpl.metrics.length} metrics, a monitoring plan and {tpl.risks.length} known {tpl.risks.length === 1 ? 'risk' : 'risks'}.</p>
            </div>
          )}
          <ErrorNote>{act.error}</ErrorNote>
          {!canCreate && <p className="text-sm text-ink-mute">Only board members, the Ekoa Representative and the faculty liaison can start projects.</p>}
          <Button type="submit" variant="dark" busy={act.busy} disabled={!canCreate} className="w-full">Create project</Button>
        </form>
      </div>
    </div>
  );
}
