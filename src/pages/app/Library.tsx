import { useSearchParams } from 'react-router-dom';
import { listOrgs, listRecords } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/hooks';
import { OBSTACLE_TAXONOMY, OUTCOMES, obstacleLabel } from '@/lib/ekoa';
import { LibraryBrowser } from '@/components/LibraryBrowser';
import { RecordTag } from '@/components/RecordTag';
import { BarList } from '@/components/Chart';
import { Badge, Empty, Loading, PageHeader, Panel, Tabs } from '@/components/ui';
import type { ImplementationRecord } from '@/lib/types';

type Tab = 'records' | 'failures' | 'patterns';

export default function Library() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'records';
  const { data } = useData(async () => {
    const [records, orgs] = await Promise.all([listRecords(), listOrgs()]);
    const mine = new Set(auth.orgs.map((o) => o.id));
    return { records: records.filter((r) => r.status === 'published' || mine.has(r.org_id)), published: records.filter((r) => r.status === 'published'), orgs };
  }, [auth.orgs.length]);
  if (!data) return <Loading />;
  const failures = data.published.filter((r) => r.outcome_class === 'did_not_work' || r.outcome_class === 'partly');
  return (
    <div>
      <PageHeader title="Library" lead="Every published record in the network, ranked by how similar the school is to yours. Failures are filed alongside successes." />
      <Tabs label="Library sections" value={tab} onChange={(k) => setParams({ tab: k })} tabs={[{ key: 'records', label: 'Records', count: data.records.length }, { key: 'failures', label: 'Failure Ledger', count: failures.length }, { key: 'patterns', label: 'Resistance patterns' }]} />
      {tab === 'records' && <LibraryBrowser records={data.records} orgs={data.orgs} myContext={auth.activeOrg?.context_profile} myOrgId={auth.activeOrg?.id} hrefBase="/app/library" />}
      {tab === 'failures' && <FailureLedger records={failures} orgs={data.orgs} />}
      {tab === 'patterns' && <Patterns records={data.published} />}
    </div>
  );
}

function FailureLedger({ records, orgs }: { records: ImplementationRecord[]; orgs: { id: string; name: string }[] }) {
  if (!records.length) return <Empty title="No failures filed yet">When a project ends early, its post-mortem lands here.</Empty>;
  return (
    <div className="space-y-6">
      <p className="max-w-prose text-ink-soft">Schools rarely publish what did not work. These schools did, so yours can skip the mistake. Each entry earns the same contribution credit as a success.</p>
      {records.map((r) => (
        <article key={r.id} className="grid gap-5 rounded-panel border border-paper-line bg-white p-5 lg:grid-cols-[320px_1fr]">
          <RecordTag r={r} href={`/app/library/${r.id}`} compact schoolName={orgs.find((o) => o.id === r.org_id)?.name} />
          <div>
            <div className="flex flex-wrap gap-1.5">{r.obstacles.map((o, i) => <Badge key={i} tone="lesson">{obstacleLabel(o.category)}</Badge>)}<Badge tone={OUTCOMES[r.outcome_class].tone === 'lesson' ? 'lesson' : 'clay'}>{OUTCOMES[r.outcome_class].label}</Badge></div>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">{r.obstacles.map((o, i) => <li key={i}>{o.note}</li>)}</ul>
            <p className="hand-note mt-4 text-2xl">{r.lessons}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function Patterns({ records }: { records: ImplementationRecord[] }) {
  const byCat = OBSTACLE_TAXONOMY.map((o) => ({ label: o.label, value: records.reduce((a, r) => a + r.obstacles.filter((x) => x.category === o.key).length, 0) })).filter((x) => x.value).sort((a, b) => b.value - a.value);
  const steps = new Map<string, number[]>();
  for (const r of records) for (const s of r.approval_summary) {
    const k = /management|trust|board/i.test(s.body) ? 'Management or trust board' : /principal|head of school|direção/i.test(s.body) ? 'Principal or head' : /vice/i.test(s.body) ? 'Vice principal' : /council|grêmio|eco club/i.test(s.body) ? 'Student council or club' : /finance|operations|administrativo/i.test(s.body) ? 'Finance or operations' : /liaison|coordinator|committee|coordenação|hod/i.test(s.body) ? 'Staff review' : s.body;
    steps.set(k, [...(steps.get(k) ?? []), s.days]);
  }
  const stepRows = [...steps.entries()].map(([label, ds]) => ({ label, value: Math.round((ds.reduce((a, b) => a + b, 0) / ds.length) * 10) / 10, n: ds.length })).sort((a, b) => b.value - a.value);
  const slowest = stepRows[0];
  return (
    <div className="space-y-6">
      <p className="max-w-prose text-ink-soft">Drawn from every published record in the network. Use it to plan: submit early to the slow steps, and design around the most common obstacles.</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Where approvals slow down">
          <p className="-mt-2 mb-4 text-sm text-ink-mute">Average days at each kind of step, across {records.length} records.{slowest ? ` ${slowest.label} is the slowest at ${slowest.value} days.` : ''}</p>
          <BarList items={stepRows.map((s) => ({ label: `${s.label} (${s.n})`, value: s.value, tone: s.value >= 10 ? 'clay' : 'leaf' }))} format={(v) => `${v} d`} />
        </Panel>
        <Panel title="Most common obstacles">
          <p className="-mt-2 mb-4 text-sm text-ink-mute">Times each obstacle type was reported in published records.</p>
          <BarList items={byCat.map((c) => ({ label: c.label, value: c.value, tone: 'lesson' }))} />
        </Panel>
      </div>
    </div>
  );
}
