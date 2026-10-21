import { Download, FileText, Printer } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { metricByCode, OUTCOMES, STAGES } from '@/lib/ekoa';
import { seriesFor, formatMetric } from '@/lib/metrics';
import { toCsv, download } from '@/lib/csv';
import { fmtDate } from '@/lib/format';
import { Button, LinkButton, Loading, PageHeader, Panel } from '@/components/ui';

export default function AppReports() {
  const auth = useAuth();
  const orgId = auth.activeOrg?.org_type === 'school' ? auth.activeOrg.id : null;
  const { data } = useData(() => (orgId ? loadSchool(orgId) : Promise.resolve(null)), [orgId]);
  if (orgId && !data) return <Loading />;
  const slug = (auth.activeOrg?.name ?? 'school').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Reports" lead="Every report is compiled from live data. Print any of them, or save as PDF from the print dialog." />
      <div className="no-print mb-6 grid gap-4 md:grid-cols-2">
        <Panel title="Cohort implementation report">
          <p className="text-sm text-ink-soft">The pilot’s main deliverable: baselines, outcomes, approval timings, obstacles and continuity compared across the cohort.</p>
          <div className="mt-4 flex flex-wrap gap-2"><LinkButton to="/app/reports/cohort" variant="dark"><FileText className="h-4 w-4" /> Open the cohort report</LinkButton><LinkButton to="/reports/pilot-01" variant="ghost">Public version</LinkButton></div>
        </Panel>
        {data && (
          <Panel title="Download your school’s data">
            <p className="text-sm text-ink-soft">Spreadsheet files (CSV). Schools own their data and can take it anywhere.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => download(`${slug}-measurements-${today}.csv`, toCsv(data.measurements.map((m) => ({ project: data.projects.find((p) => p.id === m.project_id)?.title, metric: metricByCode(m.metric_code)?.name, value: m.value, unit: metricByCode(m.metric_code)?.unit, period_start: m.period_start, period_end: m.period_end, baseline: m.is_baseline, tier: m.tier, raw: m.raw }))))}><Download className="h-4 w-4" /> Measurements</Button>
              <Button size="sm" variant="ghost" onClick={() => download(`${slug}-obstacles-${today}.csv`, toCsv(data.obstacles.map((o) => ({ project: data.projects.find((p) => p.id === o.project_id)?.title, ...o }))))}><Download className="h-4 w-4" /> Obstacles</Button>
              <Button size="sm" variant="ghost" onClick={() => download(`${slug}-approvals-${today}.csv`, toCsv(data.events.map((e) => ({ proposal: data.proposals.find((p) => p.id === e.proposal_id)?.title, step: data.steps.find((s) => s.id === e.step_id)?.body, entered: e.entered_at, decided: e.decided_at, decision: e.decision, notes: e.notes }))))}><Download className="h-4 w-4" /> Approvals</Button>
              <Button size="sm" variant="ghost" onClick={() => download(`${slug}-records-${today}.json`, JSON.stringify(data.records, null, 2), 'application/json')}><Download className="h-4 w-4" /> Records</Button>
            </div>
          </Panel>
        )}
      </div>

      {data && (
        <section className="rounded-panel border border-paper-line bg-white p-6 sm:p-10" aria-label="Leadership summary">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-mute">Leadership summary, {fmtDate(today)}</p>
              <h2 className="text-2xl font-bold">{data.org.name}: sustainability projects on one page</h2>
            </div>
            <Button className="no-print" variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-paper-line text-ink-mute"><tr><th className="py-2 pr-3 font-bold">Project</th><th className="py-2 pr-3 font-bold">Stage</th><th className="py-2 font-bold">Result so far</th></tr></thead>
              <tbody>
                {data.projects.filter((p) => p.status !== 'ended').map((p) => {
                  const t = data.targets.find((x) => x.project_id === p.id);
                  const s = t ? seriesFor(p.id, t.metric_code, data.measurements, data.targets) : null;
                  return (
                    <tr key={p.id} className="border-b border-paper-line align-top">
                      <td className="py-3 pr-3 font-bold">{p.title}</td>
                      <td className="py-3 pr-3">{STAGES.find((x) => x.key === p.stage)?.name}</td>
                      <td className="py-3">{s && s.latest !== null ? `${metricByCode(s.code)?.name}: ${formatMetric(s.code, s.baseline)} to ${formatMetric(s.code, s.latest)}${s.target !== null ? ` (target ${formatMetric(s.code, s.target)})` : ''}` : 'Baseline stage'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div><p className="text-sm text-ink-mute">Published records</p><p className="font-display text-2xl font-bold">{data.records.filter((r) => r.status === 'published').length}</p><p className="text-xs text-ink-mute">{data.records.map((r) => OUTCOMES[r.outcome_class].label).join(', ')}</p></div>
            <div><p className="text-sm text-ink-mute">Proposals decided</p><p className="font-display text-2xl font-bold">{data.proposals.filter((p) => p.decision !== 'pending').length} of {data.proposals.length}</p></div>
            <div><p className="text-sm text-ink-mute">Handover packets</p><p className="font-display text-2xl font-bold">{data.handovers.length}</p></div>
          </div>
          <p className="mt-6 text-sm text-ink-mute">Figures are verified to tier T2 or higher unless marked. Generated by Ekoa.</p>
        </section>
      )}
    </div>
  );
}
