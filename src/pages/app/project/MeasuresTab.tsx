import { useState } from 'react';
import { Plus } from 'lucide-react';
import { verifyMeasurements } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { ROLES, metricByCode } from '@/lib/ekoa';
import { seriesFor, formatMetric, completeness } from '@/lib/metrics';
import { fmtShort } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import { LineChart, SERIES } from '@/components/Chart';
import { Badge, Button, Checkbox, Empty, ErrorNote, LinkButton, Meter, Panel, cx } from '@/components/ui';

export function MeasuresTab({ b, canEdit, onChange, people }: { b: ProjectBundle; canEdit: boolean; onChange: () => void; people: Record<string, string> }) {
  const auth = useAuth();
  const isLiaison = auth.has('faculty_liaison', b.project.org_id);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const act = useAction();
  const comp = completeness(b.project.id, b.measurements, b.project.starts_on);
  const unverified = b.measurements.filter((m) => m.tier < 2).sort((a, z) => z.period_end.localeCompare(a.period_end));
  const share = b.measurements.filter((m) => !m.is_baseline).length ? b.measurements.filter((m) => !m.is_baseline && m.tier >= 2).length / b.measurements.filter((m) => !m.is_baseline).length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="w-48"><p className="mb-1 text-ink-mute">Weeks with data: {Math.round(comp * 100)}%</p><Meter value={comp} label="Data completeness" tone={comp >= 0.85 ? 'leaf' : 'clay'} /></div>
          <div className="w-48"><p className="mb-1 text-ink-mute">Verified T2 or higher: {Math.round(share * 100)}%</p><Meter value={share} label="Verified share" tone={share >= 0.7 ? 'leaf' : 'clay'} /></div>
        </div>
        {canEdit && <LinkButton to={`/app/log?project=${b.project.id}`} variant="clay"><Plus className="h-4 w-4" /> Log a measurement</LinkButton>}
      </div>

      {b.targets.length ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {b.targets.map((t, i) => {
            const s = seriesFor(b.project.id, t.metric_code, b.measurements, b.targets);
            const def = metricByCode(t.metric_code);
            return (
              <Panel key={t.id} title={def?.name ?? t.metric_code} action={s.latest !== null ? <span className={cx('text-sm font-bold', s.improving ? 'text-leaf-600' : 'text-lesson-600')}>{formatMetric(t.metric_code, s.baseline)} to {formatMetric(t.metric_code, s.latest)}</span> : undefined}>
                <p className="-mt-2 mb-3 text-xs text-ink-mute">{def?.unit}. {def?.higher_is_better ? 'Higher is better.' : 'Lower is better.'}</p>
                <LineChart points={s.points} baseline={s.baseline} target={s.target} format={(v) => formatMetric(t.metric_code, v)} label={`${def?.name} over time`} color={SERIES[i % SERIES.length]} />
              </Panel>
            );
          })}
        </div>
      ) : (
        <Empty title="No metrics chosen">Add metrics and targets in the Plan tab.</Empty>
      )}

      <Panel title={isLiaison ? 'Verify measurements' : 'Waiting for verification'} action={<Badge tone={unverified.length ? 'clay' : 'leaf'}>{unverified.length} not yet verified</Badge>}>
        {unverified.length ? (
          <>
            <ul className="divide-y divide-paper-line">
              {unverified.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  {isLiaison && <Checkbox checked={!!sel[m.id]} onChange={(v) => setSel({ ...sel, [m.id]: v })} label={<span className="sr-only">Select</span>} />}
                  <span className="w-28 text-ink-mute">{fmtShort(m.period_end)}</span>
                  <span className="flex-1 font-bold">{metricByCode(m.metric_code)?.name}: {formatMetric(m.metric_code, m.value)}</span>
                  <span className="text-ink-mute">{Object.entries(m.raw).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ')}</span>
                  <span className="text-xs text-ink-mute">by {people[m.entered_by] ?? ROLES[m.entered_role].label}</span>
                  <Badge>T{m.tier}</Badge>
                </li>
              ))}
            </ul>
            {isLiaison && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button busy={act.busy} disabled={!Object.values(sel).some(Boolean)} onClick={() => act.run(async () => { await verifyMeasurements(Object.keys(sel).filter((k) => sel[k]), 2, auth.person!.id); setSel({}); onChange(); })}>Verify selected as T2</Button>
                <button className="text-sm font-bold text-ink-soft underline" onClick={() => setSel(Object.fromEntries(unverified.map((m) => [m.id, true])))}>Select all</button>
                <p className="text-xs text-ink-mute">Check the raw numbers against the photo or log sheet before verifying.</p>
              </div>
            )}
            <ErrorNote>{act.error}</ErrorNote>
          </>
        ) : (
          <p className="text-sm text-ink-mute">Every measurement is verified.</p>
        )}
      </Panel>
    </div>
  );
}
