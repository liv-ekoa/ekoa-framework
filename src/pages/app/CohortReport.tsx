import { Link } from 'react-router-dom';
import { Printer, Send } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { useAction, useData } from '@/lib/hooks';
import { loadSchool, type SchoolData } from '@/lib/bundle';
import { METRIC_LIBRARY, OBSTACLE_TAXONOMY, metricByCode } from '@/lib/ekoa';
import { seriesFor, formatMetric } from '@/lib/metrics';
import { fmtDate } from '@/lib/format';
import { BarList } from '@/components/Chart';
import { Button, Empty, ErrorNote, Loading, Notice, cx } from '@/components/ui';

const SLUG = 'pilot-01';

interface ReportData {
  compiled_at: string;
  cohort: string;
  period: string;
  schools: { label: string; country: string }[];
  results: { school: string; project: string; metric: string; code: string; baseline: number | null; latest: number | null; target: number | null; improving: boolean | null; tier: string }[];
  approvals: { school: string; total: number; slowest: string; slowestDays: number; typicalTotal: number }[];
  rigidities: { school: string; note: string }[];
  obstacles: { label: string; value: number }[];
  continuity: { packets: number; signed: number };
  completeness: { school: string; value: number }[];
  verifiedShare: number;
  lessons: string[];
  failures: number;
  records: number;
}

async function compile(): Promise<ReportData | null> {
  const [cohorts, members, budgets] = await Promise.all([api.listCohorts(), api.listCohortMembers(), api.listBudgets()]);
  const pilot = cohorts.find((c) => /pilot/i.test(c.name));
  if (!pilot) return null;
  const schools: SchoolData[] = await Promise.all(members.filter((m) => m.cohort_id === pilot.id).map((m) => loadSchool(m.org_id)));
  const label = (s: SchoolData) => s.org.anonymised_label ?? s.org.name;
  const results: ReportData['results'] = [];
  for (const s of schools) for (const t of s.targets) {
    const p = s.projects.find((x) => x.id === t.project_id)!;
    const def = metricByCode(t.metric_code);
    if (!def?.is_impact) continue;
    const ser = seriesFor(p.id, t.metric_code, s.measurements, s.targets);
    if (ser.baseline === null && ser.latest === null) continue;
    const recent = ser.points.filter((x) => !x.baseline).slice(-4);
    results.push({ school: label(s), project: p.title, metric: def.name, code: t.metric_code, baseline: ser.baseline, latest: ser.latest, target: ser.target, improving: ser.improving, tier: recent.length ? `T${Math.min(...recent.map((x) => x.tier))}` : '—' });
  }
  const approvals = schools.map((s) => {
    const per = s.steps.map((st) => {
      const ev = s.events.filter((e) => e.step_id === st.id);
      const days = ev.reduce((a, e) => a + Math.round(((e.decided_at ? new Date(e.decided_at).getTime() : Date.now()) - new Date(e.entered_at).getTime()) / 86_400_000), 0);
      return { body: st.body, days, typical: st.typical_days, used: ev.length > 0 };
    }).filter((x) => x.used);
    const slow = [...per].sort((a, b) => b.days - b.typical - (a.days - a.typical))[0];
    return { school: label(s), total: per.reduce((a, x) => a + x.days, 0), slowest: slow?.body ?? '—', slowestDays: slow?.days ?? 0, typicalTotal: per.reduce((a, x) => a + x.typical, 0) };
  }).filter((a) => a.total > 0);
  const rigidities = schools.flatMap((s) => budgets.filter((b) => s.projects.some((p) => p.id === b.project_id) && b.rigidity_notes).map((b) => ({ school: label(s), note: b.rigidity_notes })));
  const allObs = schools.flatMap((s) => s.obstacles);
  const obstacles = OBSTACLE_TAXONOMY.map((o) => ({ label: o.label, value: allObs.filter((x) => x.category === o.key).length })).filter((x) => x.value).sort((a, b) => b.value - a.value);
  const handovers = schools.flatMap((s) => s.handovers);
  const ms = schools.flatMap((s) => s.measurements.filter((m) => !m.is_baseline));
  const records = schools.flatMap((s) => s.records);
  return {
    compiled_at: new Date().toISOString(),
    cohort: pilot.name,
    period: `${fmtDate(pilot.starts_on)} to ${pilot.ends_on ? fmtDate(pilot.ends_on) : 'ongoing'}`,
    schools: schools.map((s) => ({ label: label(s), country: s.org.country })),
    results,
    approvals,
    rigidities,
    obstacles,
    continuity: { packets: handovers.length, signed: handovers.filter((h) => h.signed_out_at && h.signed_in_at && h.signed_liaison_at).length },
    completeness: schools.flatMap((s) => {
      // Completed projects count over their own run; projects still in Identify have no schedule yet.
      const measured = s.projects.filter((p) => p.stage !== 'identify' && p.status !== 'ended' && s.measurements.some((m) => m.project_id === p.id));
      if (!measured.length) return [];
      const v = measured.reduce((a, p) => {
        const end = p.ends_on ? new Date(p.ends_on).getTime() : Date.now();
        const weeks = Math.max(1, Math.floor((end - new Date(p.starts_on).getTime()) / (7 * 86_400_000)));
        const logged = new Set(s.measurements.filter((m) => m.project_id === p.id).map((m) => Math.floor((new Date(m.period_end).getTime() - new Date(p.starts_on).getTime()) / (7 * 86_400_000))));
        return a + Math.min(1, logged.size / weeks);
      }, 0) / measured.length;
      return [{ school: label(s), value: v }];
    }),
    verifiedShare: ms.length ? ms.filter((m) => m.tier >= 2).length / ms.length : 0,
    lessons: [...schools.flatMap((s) => s.obstacles.filter((o) => o.resolution).map((o) => o.resolution)), ...records.filter((r) => r.lessons).map((r) => r.lessons.split('. ')[0] + '.')].slice(0, 8),
    failures: records.filter((r) => r.outcome_class === 'did_not_work' || r.outcome_class === 'partly').length,
    records: records.length,
  };
}

export default function CohortReport({ publicView = false }: { publicView?: boolean }) {
  const auth = useAuth();
  const act = useAction();
  const { data, reload } = useData(async () => {
    const pub = await api.getPublishedReport(SLUG);
    if (publicView) {
      if (pub) return { r: pub.data as ReportData, published: pub.published_at, live: false };
      return config.isDemo ? { r: await compile(), published: null, live: true } : { r: null, published: null, live: false };
    }
    return { r: await compile(), published: pub?.published_at ?? null, live: true };
  }, [publicView]);
  if (!data) return <div className="mx-auto max-w-page px-4 py-10"><Loading /></div>;
  const r = data.r;
  if (!r) return <div className="mx-auto max-w-page px-4 py-16"><Empty title="Report not published yet">It is published at the end of the pilot.</Empty></div>;

  const improving = r.results.filter((x) => x.improving).length;
  const slowest = [...r.approvals].sort((a, b) => b.slowestDays - a.slowestDays)[0];

  return (
    <div className={cx(publicView ? 'mx-auto max-w-page px-4 py-12 sm:px-6' : '')}>
      {!publicView && <Link to="/app/reports" className="no-print text-sm font-bold text-ink-mute hover:text-ink">Reports</Link>}
      <article className="mt-3 rounded-panel border border-paper-line bg-white p-6 sm:p-12">
        <header className="border-b border-paper-line pb-8">
          <p className="text-sm text-ink-mute">Ekoa Implementation Report 01. {r.cohort}. {r.period}.</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold sm:text-5xl">What {r.schools.length} schools learned about cutting school waste</h1>
          <p className="mt-4 max-w-prose text-lg text-ink-soft">
            {improving} of {r.results.length} tracked impact metrics improved. {Math.round(r.verifiedShare * 100)}% of measurements were verified by faculty or peers. {r.failures} of {r.records} records report something that did not fully work, on purpose.
            {slowest ? ` The slowest approval step was ${slowest.slowest} at ${slowest.slowestDays} days.` : ''}
          </p>
          <div className="no-print mt-6 flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save as PDF</Button>
            {!publicView && auth.isSteward && <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { await api.publishReport(SLUG, 'Ekoa Implementation Report 01', r, auth.person!.id); await reload(); })}><Send className="h-4 w-4" /> Publish this version</Button>}
            {data.published && <span className="text-sm text-ink-mute">Public version from {fmtDate(data.published)}</span>}
          </div>
          {data.live && <div className="mt-4"><Notice tone="clay">Live draft compiled from pilot data on {fmtDate(r.compiled_at)}. School names follow each school’s privacy choice.</Notice></div>}
          <ErrorNote>{act.error}</ErrorNote>
        </header>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">1. Schools and method</h2>
          <p className="mt-2 max-w-prose text-ink-soft">One focus area (waste), a shared baseline protocol, weekly measurement and verification tiers. Metrics come from the Ekoa library: {METRIC_LIBRARY.filter((m) => m.category === 'waste' || m.category === 'food').map((m) => m.name.toLowerCase()).join(', ')}.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">{r.schools.map((s) => <li key={s.label} className="rounded-field bg-paper px-4 py-3 text-sm"><span className="font-bold">{s.label}</span><span className="block text-ink-mute">{s.country}</span></li>)}</ul>
          <div className="mt-6 max-w-xl">
            <p className="mb-2 text-sm font-bold">Share of weeks with data, per school</p>
            <BarList items={r.completeness.map((c) => ({ label: c.school, value: Math.round(c.value * 100), tone: c.value >= 0.85 ? 'leaf' : 'clay' }))} format={(v) => `${v}%`} max={100} />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">2. Results</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-paper-line text-ink-mute"><tr><th className="py-2 pr-3 font-bold">School</th><th className="py-2 pr-3 font-bold">Project</th><th className="py-2 pr-3 font-bold">Metric</th><th className="py-2 pr-3 font-bold">Baseline</th><th className="py-2 pr-3 font-bold">Latest</th><th className="py-2 pr-3 font-bold">Target</th><th className="py-2 font-bold">Tier</th></tr></thead>
              <tbody>
                {r.results.map((x, i) => (
                  <tr key={i} className="border-b border-paper-line">
                    <td className="py-2.5 pr-3">{x.school}</td><td className="py-2.5 pr-3">{x.project}</td><td className="py-2.5 pr-3">{x.metric}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatMetric(x.code, x.baseline)}</td>
                    <td className={cx('py-2.5 pr-3 font-bold tabular-nums', x.improving ? 'text-leaf-600' : 'text-lesson-600')}>{formatMetric(x.code, x.latest)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatMetric(x.code, x.target)}</td><td className="py-2.5">{x.tier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">3. Approval timings</h2>
            <p className="mt-2 text-ink-soft">Total days from submission to decision, against the sum of each school’s typical step times (black mark).</p>
            <div className="mt-4"><BarList items={r.approvals.map((a) => ({ label: a.school, value: a.total, marker: a.typicalTotal, tone: a.total > a.typicalTotal ? 'clay' : 'leaf' }))} format={(v) => `${v} d`} markerLabel="Typical total for that school's chain" /></div>
            <ul className="mt-4 space-y-1 text-sm text-ink-soft">{r.approvals.filter((a) => a.slowest !== '—').map((a) => <li key={a.school}>{a.school}: slowest step was {a.slowest} ({a.slowestDays} days).</li>)}</ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">4. Obstacles</h2>
            <p className="mt-2 text-ink-soft">Every obstacle logged during the pilot, by type.</p>
            <div className="mt-4"><BarList items={r.obstacles.map((o) => ({ label: o.label, value: o.value, tone: 'lesson' }))} /></div>
            {r.rigidities.length > 0 && <><h3 className="mt-6 font-display font-semibold">Budget rigidities</h3><ul className="mt-2 space-y-1 text-sm text-ink-soft">{r.rigidities.map((x, i) => <li key={i}>{x.school}: {x.note}</li>)}</ul></>}
          </div>
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">5. Continuity</h2>
            <p className="mt-2 text-ink-soft">{r.continuity.packets} handover {r.continuity.packets === 1 ? 'packet was' : 'packets were'} started; {r.continuity.signed} fully signed by outgoing lead, incoming lead and faculty liaison. Project survival 90 days after each handover is reported in the final version.</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold">6. Lessons</h2>
            <ul className="hand-note mt-3 space-y-2 text-2xl">{r.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        </section>

        <footer className="mt-12 border-t border-paper-line pt-6 text-sm text-ink-mute">
          Compiled {fmtDate(r.compiled_at)} by Ekoa. No student is named in this report. Records cited are in the <Link to="/library" className="underline">Implementation Library</Link>.
        </footer>
      </article>
    </div>
  );
}
