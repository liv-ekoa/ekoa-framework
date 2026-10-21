import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GitFork } from 'lucide-react';
import { OUTCOMES, TIERS, budgetCategoryLabel, metricByCode, obstacleLabel } from '@/lib/ekoa';
import { formatMetric } from '@/lib/metrics';
import { fmtDate } from '@/lib/format';
import type { Adaptation, ImplementationRecord, Organisation, Project } from '@/lib/types';
import { BarList } from './Chart';
import { catalogue } from './RecordTag';
import { Badge, KeyValue, cx } from './ui';

const band: Record<string, string> = { worked: 'bg-leaf', partly: 'bg-clay-600', did_not_work: 'bg-lesson', too_early: 'bg-ink-mute' };

export function RecordDetail({
  r, org, adaptations = [], projects = [], orgs = [], records = [], actions, linkBase = '/library',
}: {
  r: ImplementationRecord;
  org: Organisation | null;
  adaptations?: Adaptation[];
  projects?: Project[];
  orgs?: Organisation[];
  records?: ImplementationRecord[];
  actions?: ReactNode;
  linkBase?: string;
}) {
  const o = OUTCOMES[r.outcome_class];
  const where = r.anonymised || !org ? r.context.descriptor : `${org.name}, ${r.context.city}, ${r.context.country}`;
  const source = projects.length ? records.find((x) => x.id === projects.find((p) => p.id === r.project_id)?.adapted_from_record_id) : undefined;
  const children = adaptations.filter((a) => a.source_record_id === r.id);

  return (
    <article className="space-y-8">
      <header className="relative overflow-hidden rounded-panel border border-paper-line bg-white p-6 sm:p-8">
        <span className={cx('absolute inset-y-0 left-0 w-2', band[r.outcome_class])} aria-hidden />
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-mute">
          <span className="font-bold tabular-nums text-ink-soft">{catalogue(r)}</span>
          <span>{r.category}</span>
          {r.published_at && <span>Published {fmtDate(r.published_at)}</span>}
          {r.version > 1 && <span>Version {r.version}</span>}
          {r.ai_drafted && <Badge tone="sky">AI-drafted, edited by the team</Badge>}
        </div>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold sm:text-4xl">{r.title}</h1>
        <p className="mt-2 text-ink-mute">{where}</p>
        <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink-soft">{r.summary}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className={cx('rounded-tag px-2.5 py-1 text-sm font-bold text-white', band[r.outcome_class])}>{o.label}</span>
          <span className="rounded-tag border border-clay-600/50 bg-clay-100 px-2.5 py-1 text-sm font-bold text-clay-700">{TIERS[r.tier].label}</span>
          {r.anonymised && <Badge>School name hidden at its request</Badge>}
        </div>
        {actions && <div className="mt-6 flex flex-wrap gap-2 border-t border-paper-line pt-5">{actions}</div>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold">Outcomes</h2>
            <div className="mt-3 overflow-x-auto rounded-panel border border-paper-line bg-white">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-paper-line text-ink-mute">
                  <tr><th className="px-4 py-2.5 font-bold">Metric</th><th className="px-4 py-2.5 font-bold">Baseline</th><th className="px-4 py-2.5 font-bold">Result</th><th className="px-4 py-2.5 font-bold">Change</th><th className="px-4 py-2.5 font-bold">Tier</th></tr>
                </thead>
                <tbody>
                  {r.outcomes.map((x) => {
                    const def = metricByCode(x.metric_code);
                    const diff = x.result - x.baseline;
                    const good = def ? (def.higher_is_better ? diff > 0 : diff < 0) : false;
                    return (
                      <tr key={x.metric_code} className="border-b border-paper-line last:border-0">
                        <td className="px-4 py-3"><span className="font-bold text-ink">{def?.name ?? x.metric_code}</span><span className="block text-xs text-ink-mute">{def?.unit}</span></td>
                        <td className="px-4 py-3 tabular-nums">{formatMetric(x.metric_code, x.baseline)}</td>
                        <td className="px-4 py-3 font-bold tabular-nums">{formatMetric(x.metric_code, x.result)}</td>
                        <td className={cx('px-4 py-3 font-bold tabular-nums', good ? 'text-leaf-600' : 'text-lesson-600')}>{diff > 0 ? '+' : ''}{formatMetric(x.metric_code, diff)}{def?.unit.startsWith('%') ? ' pts' : ''}</td>
                        <td className="px-4 py-3">T{x.tier}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">The problem</h2>
              <p className="mt-2 max-w-prose leading-relaxed text-ink-soft">{r.problem}</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold">What they did</h2>
              <p className="mt-2 max-w-prose leading-relaxed text-ink-soft">{r.intervention}</p>
              <p className="mt-2 text-sm text-ink-mute">Timeline: {r.timeline}</p>
            </div>
          </section>

          {r.approval_summary.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold">Approval path</h2>
              <p className="mt-1 text-sm text-ink-mute">Days spent at each step of the school’s approval chain: {r.approval_summary.reduce((a, b) => a + b.days, 0)} days in total.</p>
              <div className="mt-4 rounded-panel border border-paper-line bg-white p-5">
                <BarList
                  items={r.approval_summary.map((s) => ({ label: s.body, value: s.days, tone: s.days >= 14 ? 'clay' : 'leaf' }))}
                  format={(v) => `${v} d`}
                />
              </div>
            </section>
          )}

          {r.obstacles.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold">Obstacles</h2>
              <ul className="mt-3 space-y-3">
                {r.obstacles.map((ob, i) => (
                  <li key={i} className="flex gap-3 rounded-field border border-paper-line bg-white p-4">
                    <Badge tone="lesson" className="h-fit shrink-0">{obstacleLabel(ob.category)}</Badge>
                    <span className="text-ink-soft">{ob.note}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.lessons && (
            <section>
              <h2 className="text-xl font-semibold">What they would do differently</h2>
              <blockquote className="mt-3 rounded-panel border border-lesson/20 bg-lesson-100/60 px-6 py-5 font-hand text-2xl leading-snug text-lesson-600">
                {r.lessons}
              </blockquote>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-panel border border-paper-line bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">Context</h2>
            <KeyValue
              items={[
                ['Location', r.anonymised ? `${r.context.country} (city hidden)` : `${r.context.city}, ${r.context.country}`],
                ['Size', `${r.context.size_band} students`],
                ['Curriculum', r.context.curriculum],
                ['Climate', r.context.climate_zone],
                ['Budget band', r.context.budget_band],
                ['Waste collection', r.context.waste_contractor],
                ['Approval chain', `${r.context.governance_chain_length} steps`],
              ]}
            />
          </section>
          <BudgetBox r={r} />
          {r.materials.length > 0 && (
            <section className="rounded-panel border border-paper-line bg-white p-5">
              <h2 className="mb-3 text-lg font-semibold">Reusable materials</h2>
              <ul className="space-y-2">
                {r.materials.map((m) => (
                  <li key={m.name} className="flex items-center justify-between gap-3 text-sm"><span className="text-ink">{m.name}</span><Badge>{m.kind}</Badge></li>
                ))}
              </ul>
            </section>
          )}
          <section className="rounded-panel border border-paper-line bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><GitFork className="h-4 w-4" /> Lineage</h2>
            {source && (
              <p className="mb-3 text-sm text-ink-soft">Adapted from <Link className="font-bold text-leaf-600 underline-offset-2 hover:underline" to={`${linkBase}/${source.id}`}>{source.title}</Link></p>
            )}
            {children.length ? (
              <ul className="space-y-2 text-sm">
                {children.map((a) => {
                  const p = projects.find((x) => x.id === a.project_id);
                  const o2 = orgs.find((x) => x.id === p?.org_id);
                  return (
                    <li key={a.id} className="text-ink-soft">
                      Adapted by <span className="font-bold text-ink">{o2?.name ?? 'a member school'}</span>{p ? `: ${p.title}` : ''}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-mute">No school has adapted this record yet.</p>
            )}
          </section>
          {r.contributors.length > 0 && (
            <section className="rounded-panel border border-paper-line bg-white p-5">
              <h2 className="mb-2 text-lg font-semibold">Contributors</h2>
              <p className="text-sm text-ink-soft">Listed by role, not by name: {r.contributors.join('; ')}.</p>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

function BudgetBox({ r }: { r: ImplementationRecord }) {
  const lines = r.budget_lines ?? [];
  const max = Math.max(1, ...lines.map((l) => Math.max(l.planned, l.actual)));
  const money = (n: number) => `${r.budget_currency} ${Math.round(n).toLocaleString('en-GB')}`;
  return (
    <section className="rounded-panel border border-paper-line bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold">Budget</h2>
      {r.budget_planned > 0 || r.budget_actual > 0 ? (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-field bg-paper px-3 py-2"><dt className="text-xs text-ink-mute">Planned</dt><dd className="text-lg font-bold tabular-nums">{money(r.budget_planned)}</dd></div>
            <div className="rounded-field bg-paper px-3 py-2"><dt className="text-xs text-ink-mute">Actually spent</dt><dd className={cx('text-lg font-bold tabular-nums', r.budget_actual > r.budget_planned && 'text-alert')}>{money(r.budget_actual)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-ink-mute">About USD {Math.round(r.budget_amount_usd).toLocaleString('en-GB')} at a fixed yearly rate, for comparing across countries.</p>
          {lines.length > 0 && (
            <ul className="mt-4 space-y-2.5" aria-label="Spending by category">
              {lines.map((l) => (
                <li key={l.category} className="text-sm">
                  <div className="flex justify-between gap-2"><span className="font-bold">{budgetCategoryLabel(l.category)}</span><span className="tabular-nums text-ink-mute">{Math.round(l.actual).toLocaleString('en-GB')} of {Math.round(l.planned).toLocaleString('en-GB')}</span></div>
                  <div className="relative mt-1 h-2 rounded-full bg-paper-deep" aria-hidden>
                    <div className="absolute inset-y-0 left-0 rounded-full border border-dashed border-ink-mute/60" style={{ width: `${(l.planned / max) * 100}%` }} />
                    <div className={cx('absolute inset-y-0 left-0 rounded-full', l.actual > l.planned ? 'bg-alert' : 'bg-leaf')} style={{ width: `${(l.actual / max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-ink-soft">{r.budget_summary}</p>
        </>
      ) : <p className="text-ink-soft">{r.budget_summary || 'Not recorded.'}</p>}
    </section>
  );
}
