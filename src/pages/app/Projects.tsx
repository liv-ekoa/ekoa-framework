import { lazy, Suspense, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { STAGES, metricByCode } from '@/lib/ekoa';
import { seriesFor, formatMetric } from '@/lib/metrics';
import { fmtDate } from '@/lib/format';
import { StageRing } from '@/components/Logo';
import { Badge, Empty, LinkButton, Loading, PageHeader, Tabs, cx } from '@/components/ui';

const Metrics = lazy(() => import('./Metrics'));
import type { ProjectStatus } from '@/lib/types';

const STATUS_TONE: Record<ProjectStatus, 'leaf' | 'clay' | 'lesson' | 'mute' | 'sky'> = { active: 'leaf', stalled: 'clay', paused: 'mute', completed: 'sky', ended: 'lesson' };

export default function Projects() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'metrics' ? 'metrics' : 'projects';
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const { data } = useData(() => (auth.activeOrg ? loadSchool(auth.activeOrg.id) : Promise.resolve(null)), [auth.activeOrg?.id]);
  if (!data) return <Loading />;
  const open = data.projects.filter((p) => ['active', 'stalled', 'paused'].includes(p.status));
  const closed = data.projects.filter((p) => ['completed', 'ended'].includes(p.status));
  const list = tab === 'open' ? open : closed;
  const independent = auth.activeOrg?.org_type === 'independent';
  const switcher = (
    <div role="tablist" aria-label="Projects or metrics" className="inline-flex rounded-full border border-paper-line bg-white p-1">
      {([['projects', 'Projects'], ['metrics', 'Metrics']] as const).map(([k, label]) => (
        <button key={k} role="tab" aria-selected={view === k} onClick={() => setParams(k === 'metrics' ? { view: 'metrics' } : {})} className={cx('rounded-full px-4 py-1.5 text-sm font-bold', view === k ? 'bg-moss text-paper' : 'text-ink-soft hover:text-ink')}>{label}</button>
      ))}
    </div>
  );
  if (view === 'metrics')
    return (
      <div>
        <PageHeader title="Projects" lead="Comparable numbers with fixed units and protocols, for every project. Participation is tracked, but never reported as impact." actions={<><LinkButton to="/app/log" variant="clay">Log a measurement</LinkButton><LinkButton to="/app/projects/new" variant="dark">Start a project</LinkButton></>}>{switcher}</PageHeader>
        <Suspense fallback={<Loading />}><Metrics embedded /></Suspense>
      </div>
    );
  return (
    <div>
      <PageHeader title="Projects" lead={independent ? 'Projects you lead on your own. When your school joins Ekoa, an Ekoa admin can move them to your school.' : 'Every project belongs to the school, not to the students who start it.'} actions={<LinkButton to="/app/projects/new" variant="dark">Start a project</LinkButton>}>{switcher}</PageHeader>
      <Tabs label="Project status" value={tab} onChange={setTab} tabs={[{ key: 'open', label: 'Open', count: open.length }, { key: 'closed', label: 'Completed and ended', count: closed.length }]} />
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((p) => {
            const st = STAGES.find((s) => s.key === p.stage)!;
            const tasks = data.tasks.filter((t) => t.project_id === p.id);
            const done = tasks.filter((t) => t.status === 'done').length;
            const lead = data.targets.find((t) => t.project_id === p.id);
            const ser = lead ? seriesFor(p.id, lead.metric_code, data.measurements, data.targets) : null;
            return (
              <Link key={p.id} to={`/app/projects/${p.id}`} className="flex flex-col gap-4 rounded-panel border border-paper-line bg-white p-5 hover:border-ink/40">
                <div className="flex items-start gap-3">
                  <StageRing stage={p.stage} size={42} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold">{p.title}</h2>
                    <p className="text-sm text-ink-mute">{p.category}. Stage {st.n}, {st.name}. Started {fmtDate(p.starts_on)}.</p>
                  </div>
                  <Badge tone={STATUS_TONE[p.status]}>{p.status[0].toUpperCase() + p.status.slice(1)}</Badge>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3 border-t border-paper-line pt-3 text-sm">
                  <span className="text-ink-mute">{done} of {tasks.length} tasks done{p.adapted_from_record_id ? '. Adapted from another school' : ''}</span>
                  {ser && ser.latest !== null && <span className="font-bold tabular-nums">{metricByCode(ser.code)?.name}: {formatMetric(ser.code, ser.baseline)} to {formatMetric(ser.code, ser.latest)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty title={tab === 'open' ? 'No open projects' : 'Nothing completed yet'} action={tab === 'open' ? <LinkButton to="/app/projects/new">Start a project</LinkButton> : undefined}>
          {tab === 'open' ? 'Start from a template, or adapt a record from another school in the Library.' : 'Completed and ended projects stay here as part of the school archive.'}
        </Empty>
      )}
    </div>
  );
}
