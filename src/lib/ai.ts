// Record drafting. Calls the `ai-draft` Edge Function (which holds the model API key on the
// server). If the function is not deployed, it composes a draft from the project's own data.
import { supabase } from './db';
import { STAGES, metricByCode, obstacleLabel } from './ekoa';
import { seriesFor, formatMetric } from './metrics';
import { currencyFor } from './ekoa';
import { summariseBudget } from './budget';
import type { ProjectBundle } from './bundle';
import type { ImplementationRecord } from './types';

export async function draftRecord(b: ProjectBundle): Promise<Partial<ImplementationRecord>> {
  const local = composeLocally(b);
  try {
    // Only project facts are sent, never student names or contact details.
    const { data, error } = await supabase.functions.invoke('ai-draft', {
      body: {
        title: b.project.title,
        problem: b.project.problem,
        solution: b.project.solution,
        outcomes: local.outcomes,
        obstacles: b.obstacles.map((o) => ({ category: o.category, description: o.description, resolution: o.resolution })),
        approvals: local.approval_summary,
        budget: local.budget_summary,
      },
    });
    if (error || !data) return local;
    return { ...local, summary: data.summary ?? local.summary, intervention: data.intervention ?? local.intervention, lessons: data.lessons ?? local.lessons };
  } catch {
    return local;
  }
}

function composeLocally(b: ProjectBundle): Partial<ImplementationRecord> {
  const codes = [...new Set(b.targets.map((t) => t.metric_code))];
  const outcomes = codes
    .map((c) => {
      const s = seriesFor(b.project.id, c, b.measurements, b.targets);
      const recent = s.points.filter((p) => !p.baseline).slice(-3);
      const tier = recent.length ? (Math.min(...recent.map((p) => p.tier)) as 0 | 1 | 2 | 3 | 4) : 0;
      return s.baseline !== null && s.latest !== null ? { metric_code: c, baseline: Math.round(s.baseline), result: Math.round(s.latest), tier } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const weeks = Math.max(1, Math.round((Date.now() - new Date(b.project.starts_on).getTime()) / (7 * 86_400_000)));
  const headline = outcomes
    .slice(0, 2)
    .map((o) => `${metricByCode(o.metric_code)?.name.toLowerCase()} moved from ${formatMetric(o.metric_code, o.baseline)} to ${formatMetric(o.metric_code, o.result)}`)
    .join(' and ');

  const approvals = b.proposals.flatMap((p) =>
    b.events
      .filter((e) => e.proposal_id === p.id && e.decided_at)
      .map((e) => ({ body: b.steps.find((s) => s.id === e.step_id)?.body ?? 'Step', days: Math.max(0, Math.round((new Date(e.decided_at!).getTime() - new Date(e.entered_at).getTime()) / 86_400_000)) })),
  );
  const budget = summariseBudget(b.budgets, b.budgetLines, currencyFor(b.org.country));
  const stage = STAGES.find((s) => s.key === b.project.stage)!;

  return {
    title: b.project.title,
    category: b.project.category,
    summary: headline
      ? `${b.project.title}: in ${weeks} weeks, ${headline}.`
      : `${b.project.title}: ${weeks} weeks in, currently at the ${stage.name} stage.`,
    problem: b.project.problem,
    intervention: b.project.solution,
    timeline: `${weeks} weeks since ${new Date(b.project.starts_on).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
    budget_summary: budget.text,
    budget_amount_usd: budget.usdActual,
    budget_planned: budget.planned,
    budget_actual: budget.actual,
    budget_currency: budget.currency,
    budget_lines: budget.byCategory,
    approval_summary: approvals,
    obstacles: b.obstacles.map((o) => ({ category: o.category, note: o.description || obstacleLabel(o.category) })),
    outcomes,
    lessons: b.obstacles.filter((o) => o.resolution).map((o) => o.resolution).join(' '),
    ai_drafted: true,
  };
}
