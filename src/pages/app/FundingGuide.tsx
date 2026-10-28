import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Copy, ExternalLink, Printer } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/hooks';
import { summariseBudget } from '@/lib/budget';
import { currencyFor, metricByCode } from '@/lib/ekoa';
import { ALL_COUNTRIES, FUNDING_ROLES, FUNDING_STEPS, PAYING_RULES, PLATFORM_QUESTIONS, PROJECT_SUMMARY, ROUTES, guideFor } from '@/lib/funding';
import type { BudgetLine, BudgetPathway, Organisation, Project, ProjectMetric } from '@/lib/types';
import { Badge, Button, Empty, Field, LinkButton, Loading, Notice, PageHeader, Panel, Select, Textarea, cx } from '@/components/ui';

/** The funding ask, written from what the team already put in the project. Gaps are left as [prompts]. */
function fundingAsk(org: Organisation, p: Project, lines: BudgetLine[], targets: ProjectMetric[]): string {
  const school = org.org_type === 'independent' ? org.school_name || '[your school]' : org.name;
  const cur = lines[0]?.currency ?? currencyFor(org.country);
  const total = lines.reduce((n, l) => n + l.planned, 0);
  const fmt = (n: number) => `${cur} ${Math.round(n).toLocaleString('en-GB')}`;
  const budget = lines.length
    ? [...lines.map((l) => `- ${l.item}: ${fmt(l.planned)}${l.note ? ` (${l.note})` : ''}`), `Total: ${fmt(total)}`].join('\n')
    : '[Add your budget lines in the Plan tab of the project]';
  const shown = targets.length
    ? targets.map((t) => {
        const m = metricByCode(t.metric_code);
        const unit = m?.unit ?? '';
        return `- ${m?.name ?? t.metric_code}: ${t.baseline !== null ? `from ${t.baseline} ` : ''}${t.target !== null ? `to ${t.target} ` : ''}${unit}`.trim();
      }).join('\n')
    : '[Name the Ekoa metric and the target]';
  return [
    `${p.title}, ${school}`,
    '',
    'The problem',
    p.problem.trim() || '[Two sentences with one number from your own baseline measurement]',
    '',
    'What we will do',
    p.solution.trim() || '[Three to five concrete steps and who does them]',
    '',
    'Who we are',
    `Students at ${school}, supported by [the teacher who holds the account].`,
    '',
    'The budget',
    budget,
    '',
    'How we will show it worked',
    shown,
    'We will publish the result on our Ekoa Implementation Record, even if it falls short.',
    '',
    'What happens to extra money',
    '[Decide this before you launch]',
  ].join('\n');
}

/** Every project starts with its budget. This turns a budget into a funding ask. */
function ProjectBudgets({ org }: { org: Organisation }) {
  const [params, setParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const { data } = useData(async () => {
    const [projects, lines, pathways, targets] = await Promise.all([api.listProjects(org.id), api.listBudgetLines(), api.listBudgets(), api.listProjectMetrics()]);
    return { projects: projects.filter((p) => p.status !== 'ended' && p.status !== 'completed'), lines, pathways, targets };
  }, [org.id]);
  if (!data) return <Panel title="Your projects’ budgets"><Loading /></Panel>;
  if (!data.projects.length)
    return <Panel title="Your projects’ budgets"><Empty title="No open projects yet" action={<LinkButton to="/app/projects/new" variant="dark">Start a project</LinkButton>}>Every project starts with its budget. Start one, add its budget in the Plan tab, and it appears here.</Empty></Panel>;
  const chosen = data.projects.find((p) => p.id === params.get('project')) ?? null;
  const linesOf = (id: string) => data.lines.filter((l) => l.project_id === id);
  const pathOf = (id: string): BudgetPathway[] => data.pathways.filter((b) => b.project_id === id);
  const ask = chosen ? fundingAsk(org, chosen, linesOf(chosen.id), data.targets.filter((t) => t.project_id === chosen.id)) : '';
  return (
    <Panel title="Your projects’ budgets" id="ask">
      <p className="mb-4 text-sm text-ink-soft">Every project starts with its budget. Pick one to turn it into a funding ask you can paste into any platform below.</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {data.projects.map((p) => {
          const lines = linesOf(p.id);
          const paths = pathOf(p.id);
          const sum = summariseBudget(paths, lines, currencyFor(org.country));
          const none = !lines.length && !sum.zeroCost;
          return (
            <li key={p.id} className={cx('rounded-field border p-3', chosen?.id === p.id ? 'border-moss bg-moss/5' : 'border-paper-line bg-white')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link to={`/app/projects/${p.id}`} className="font-bold hover:underline">{p.title}</Link>
                {sum.zeroCost ? <Badge tone="leaf">Zero-cost</Badge> : none ? <Badge tone="clay">No budget yet</Badge> : <Badge tone="sky">{sum.currency} {Math.round(sum.planned).toLocaleString('en-GB')}</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{none ? 'Add the budget lines first: what you will buy, and what each costs.' : sum.text}</p>
              {paths[0] && !sum.zeroCost && <p className="mt-1 text-xs text-ink-mute">Funding status: {paths[0].status}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {none
                  ? <LinkButton size="sm" variant="ghost" to={`/app/projects/${p.id}?tab=plan`}>Add the budget</LinkButton>
                  : !sum.zeroCost && <Button size="sm" variant={chosen?.id === p.id ? 'dark' : 'ghost'} onClick={() => { setCopied(false); setParams({ project: p.id }, { replace: true }); }}>Write the funding ask</Button>}
              </div>
            </li>
          );
        })}
      </ul>
      {chosen && (
        <div className="mt-5 border-t border-paper-line pt-4">
          <Field label={`Funding ask for ${chosen.title}`} id="fa" hint="Written from your project plan. Replace anything in [brackets], and have your teacher read it before it goes public. First names or roles only for anyone under 18.">
            <Textarea id="fa" rows={16} readOnly value={ask} className="font-mono text-sm" />
          </Field>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(ask); setCopied(true); } catch { setCopied(false); } }}>{copied ? <><Check className="h-4 w-4" aria-hidden /> Copied</> : <><Copy className="h-4 w-4" aria-hidden /> Copy the ask</>}</Button>
            <LinkButton size="sm" variant="ghost" to={`/app/projects/${chosen.id}?tab=plan`}>Edit the budget</LinkButton>
          </div>
        </div>
      )}
    </Panel>
  );
}

export default function FundingGuide() {
  const auth = useAuth();
  const org = auth.activeOrg;
  const [country, setCountry] = useState(org && ALL_COUNTRIES.includes(org.country) ? org.country : '');
  const guide = guideFor(country);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Funding"
        lead="Some projects need money and some students have none. Start from your project’s budget, then find where to raise the money in your country. Ekoa does not collect or hold the money."
        actions={<Button variant="quiet" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print the packet</Button>}
      />

      {org && <ProjectBudgets org={org} />}

      <Notice tone="clay">
        Ekoa is built for minors. A teacher or another adult should hold any fundraising account, and no student under 18 should be named or photographed without guardian consent.
      </Notice>

      <Panel title="Steps">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {FUNDING_STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </Panel>

      <Panel title="Who is in charge">
        <p className="mb-3 text-sm text-ink-soft">A funding team has several students, a teacher and an advisor, so no single person handles the money alone.</p>
        <dl className="divide-y divide-paper-line">
          {FUNDING_ROLES.map((r) => (
            <div key={r.who} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr]">
              <dt><span className="font-bold">{r.who}</span><span className="block text-xs text-ink-mute">{r.role}</span></dt>
              <dd className="text-sm">{r.does}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="What your project summary should say">
        <div className="grid gap-4 md:grid-cols-2">
          {PROJECT_SUMMARY.map((p) => (
            <div key={p.heading} className="rounded-field border border-paper-line p-3">
              <h3 className="font-bold">{p.heading}</h3>
              <p className="text-sm text-ink-soft">{p.prompt}</p>
              <p className="mt-2 text-sm italic text-ink-mute">Example: {p.example}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Four ways to collect the money">
        <div className="grid gap-3 md:grid-cols-2">
          {ROUTES.map((r) => (
            <div key={r.name} className="rounded-field border border-paper-line p-3 text-sm">
              <h3 className="font-bold">{r.name}</h3>
              <p className="text-xs text-ink-mute">{r.best}</p>
              <p className="mt-1">{r.how}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Where to raise the money in your country">
        <div className="no-print mb-3 max-w-xs">
          <Field label="Your country">
            <Select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Select your country</option>
              {ALL_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        {!country ? <p className="text-sm text-ink-soft">Pick your country to see where students there can raise money.</p> : <>
        <p className="mb-3 text-sm text-ink-soft">{guide.summary}</p>
        <ul className="space-y-3">
          {guide.options.map((p) => (
            <li key={p.name} className="rounded-field border border-paper-line p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{p.name} <Badge>{p.kind}</Badge></span>
                <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-moss hover:underline">Open <ExternalLink className="h-3 w-3" aria-hidden /></a>
              </div>
              <p className="mt-1">{p.note}</p>
              <p className="mt-1 text-ink-soft"><span className="font-bold">Check:</span> {p.confirm}</p>
            </li>
          ))}
        </ul>
        <h3 className="mt-4 font-bold">Ask any platform or sponsor these five questions</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {PLATFORM_QUESTIONS.map((q) => <li key={q}>{q}</li>)}
        </ul>
        <p className="mt-3 text-xs text-ink-mute">Platform rules change and we cannot promise these are current. Confirm with the platform before you commit.</p>
        </>}
      </Panel>

      <Panel title="How the project actually gets paid for">
        <dl className="divide-y divide-paper-line">
          {PAYING_RULES.map((r) => (
            <div key={r.title} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr]">
              <dt className="font-bold">{r.title}</dt>
              <dd className="text-sm">{r.body}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
