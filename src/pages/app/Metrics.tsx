import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MonitorPlay } from 'lucide-react';
import { verifyMeasurements } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { METRIC_LIBRARY, metricByCode } from '@/lib/ekoa';
import { seriesFor, formatMetric, completeness } from '@/lib/metrics';
import { fmtShort } from '@/lib/format';
import { LineChart, SERIES } from '@/components/Chart';
import { Badge, Button, Checkbox, Empty, ErrorNote, LinkButton, Loading, Meter, PageHeader, Panel, Tabs, cx } from '@/components/ui';

type Tab = 'dashboard' | 'verify' | 'library' | 'kiosk';

/** Measurements for every project. Shown as the Metrics view of the Projects page. */
export default function Metrics({ embedded = false }: { embedded?: boolean }) {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'dashboard';
  const { data, reload } = useData(() => loadSchool(auth.activeOrg!.id), [auth.activeOrg?.id]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const act = useAction();
  if (!data) return <Loading />;
  const isLiaison = auth.has('faculty_liaison');
  const active = data.projects.filter((p) => p.status === 'active' && data.targets.some((t) => t.project_id === p.id));
  const unverified = data.measurements.filter((m) => m.tier < 2 && !m.is_baseline);
  const projName = (id: string) => data.projects.find((p) => p.id === id)?.title ?? '';

  return (
    <div>
      {!embedded && <PageHeader title="Metrics" lead="Comparable numbers with fixed units and protocols. Participation is tracked, but never reported as impact." actions={<LinkButton to="/app/log" variant="clay">Log a measurement</LinkButton>} />}
      <Tabs label="Metrics sections" value={tab} onChange={(k) => setParams(embedded ? { view: 'metrics', tab: k } : { tab: k })} tabs={[{ key: 'dashboard', label: 'School dashboard' }, { key: 'verify', label: 'Verification', count: unverified.length }, { key: 'library', label: 'Metric library' }, { key: 'kiosk', label: 'Corridor screen' }]} />

      {tab === 'dashboard' && (
        active.length ? (
          <div className="space-y-8">
            {active.map((p) => {
              const comp = completeness(p.id, data.measurements, p.starts_on);
              return (
                <section key={p.id}>
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-xl font-semibold"><Link to={`/app/projects/${p.id}?tab=measures`} className="hover:underline">{p.title}</Link></h2>
                    <div className="flex w-56 items-center gap-2 text-xs text-ink-mute"><Meter value={comp} label="Data completeness" tone={comp >= 0.85 ? 'leaf' : 'clay'} /><span className="shrink-0">{Math.round(comp * 100)}% weeks</span></div>
                  </div>
                  <div className="grid gap-5 xl:grid-cols-2">
                    {data.targets.filter((t) => t.project_id === p.id).map((t, i) => {
                      const s = seriesFor(p.id, t.metric_code, data.measurements, data.targets);
                      const def = metricByCode(t.metric_code);
                      return (
                        <Panel key={t.id} title={def?.name} action={s.latest !== null ? <span className={cx('text-sm font-bold', s.improving ? 'text-leaf-600' : 'text-lesson-600')}>{formatMetric(t.metric_code, s.latest)} now</span> : undefined}>
                          <p className="-mt-2 mb-3 text-xs text-ink-mute">{def?.unit}</p>
                          <LineChart points={s.points} baseline={s.baseline} target={s.target} format={(v) => formatMetric(t.metric_code, v)} label={`${def?.name} for ${p.title}`} color={SERIES[i % SERIES.length]} height={190} />
                        </Panel>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : <Empty title="No active projects with metrics">Choose metrics in a project’s Plan tab, then log the baseline.</Empty>
      )}

      {tab === 'verify' && (
        <Panel title="Measurements waiting for verification" action={<Badge tone={unverified.length ? 'clay' : 'leaf'}>{unverified.length}</Badge>}>
          {unverified.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-ink-mute"><tr>{isLiaison && <th className="w-10" />}<th className="py-2 pr-3 font-bold">Week ending</th><th className="py-2 pr-3 font-bold">Project</th><th className="py-2 pr-3 font-bold">Metric</th><th className="py-2 pr-3 font-bold">Value</th><th className="py-2 pr-3 font-bold">Raw numbers</th><th className="py-2 font-bold">Tier</th></tr></thead>
                  <tbody>
                    {unverified.map((m) => (
                      <tr key={m.id} className="border-t border-paper-line">
                        {isLiaison && <td className="py-2"><Checkbox checked={!!sel[m.id]} onChange={(v) => setSel({ ...sel, [m.id]: v })} label={<span className="sr-only">Select</span>} /></td>}
                        <td className="py-2 pr-3">{fmtShort(m.period_end)}</td>
                        <td className="py-2 pr-3">{projName(m.project_id)}</td>
                        <td className="py-2 pr-3">{metricByCode(m.metric_code)?.name}</td>
                        <td className="py-2 pr-3 font-bold tabular-nums">{formatMetric(m.metric_code, m.value)}</td>
                        <td className="py-2 pr-3 text-ink-mute">{Object.entries(m.raw).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ')}</td>
                        <td className="py-2">T{m.tier}{m.evidence_id ? ', photo' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isLiaison ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button busy={act.busy} disabled={!Object.values(sel).some(Boolean)} onClick={() => act.run(async () => { await verifyMeasurements(Object.keys(sel).filter((k) => sel[k]), 2, auth.person!.id); setSel({}); await reload(); })}>Verify selected as T2</Button>
                  <button className="text-sm font-bold underline" onClick={() => setSel(Object.fromEntries(unverified.map((m) => [m.id, true])))}>Select all</button>
                </div>
              ) : <p className="mt-4 text-sm text-ink-mute">Your faculty liaison verifies these against photos and log sheets.</p>}
              <ErrorNote>{act.error}</ErrorNote>
            </>
          ) : <p className="text-sm text-ink-mute">Nothing waiting. Every measurement is verified.</p>}
        </Panel>
      )}

      {tab === 'library' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {METRIC_LIBRARY.map((m) => (
            <article key={m.code} className="rounded-panel border border-paper-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-display text-lg font-semibold">{m.name}</h2><p className="text-sm text-ink-mute">{m.unit}. {m.frequency}.</p></div>
                {m.is_impact ? <Badge tone="leaf">Impact</Badge> : <Badge>Not impact</Badge>}
              </div>
              <p className="mt-3 text-sm text-ink-soft">{m.protocol}</p>
              <p className="mt-2 text-xs text-ink-mute">{m.comparability_notes}</p>
              <p className="mt-2 text-xs text-ink-mute">You enter: {m.inputs.map((i) => `${i.label.toLowerCase()} (${i.unit})`).join(', ')}.</p>
            </article>
          ))}
        </div>
      )}

      {tab === 'kiosk' && (
        <Panel title="Show your numbers in the corridor">
          <p className="max-w-prose text-ink-soft">Solar panels that students never see change nothing. Open this view on a corridor screen or projector. It rotates through your school’s current numbers, shows no names, and refreshes every few minutes.</p>
          <LinkButton to={`/kiosk/${data.org.id}`} variant="dark" className="mt-4"><MonitorPlay className="h-4 w-4" /> Open the corridor screen</LinkButton>
        </Panel>
      )}
    </div>
  );
}
