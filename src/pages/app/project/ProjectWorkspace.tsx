import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { GitFork } from 'lucide-react';
import { loadProjectBundle } from '@/lib/bundle';
import { listPeople } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/hooks';
import { STAGES } from '@/lib/ekoa';
import { StageRail } from '@/components/StageRail';
import { Badge, Empty, Loading, Tabs } from '@/components/ui';
import type { StageKey } from '@/lib/types';
import { GatePanel } from './GatePanel';
import { StatusControl } from './StatusControl';
import { PlanTab } from './PlanTab';
import { TasksTab } from './TasksTab';
import { ApprovalsTab } from './ApprovalsTab';
import { MeasuresTab } from './MeasuresTab';
import { ObstaclesTab } from './ObstaclesTab';
import { RecordTab } from './RecordTab';
import { EvidenceTab } from './EvidenceTab';
import { HomeTab } from './HomeTab';
import { ChatTab } from './ChatTab';
import { CommunityTab } from './CommunityTab';
import { FilesTab } from './FilesTab';
import { FeedbackTab } from './FeedbackTab';

type TabKey = 'feedback' | 'files' | 'home' | 'chat' | 'community' | 'plan' | 'tasks' | 'approvals' | 'measures' | 'obstacles' | 'record' | 'evidence';

export default function ProjectWorkspace() {
  const { id } = useParams();
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: b, reload, error } = useData(() => loadProjectBundle(id!), [id]);
  const { data: people } = useData(async () => Object.fromEntries((await listPeople()).map((p) => [p.id, p.display_name])));
  const [stage, setStage] = useState<StageKey | null>(null);
  const tab = (params.get('tab') as TabKey) ?? 'home';
  useEffect(() => {
    if (b && !stage) setStage(b.project.stage);
  }, [b, stage]);

  if (error) return <Empty title="Project not found">It may belong to another school.</Empty>;
  if (!b || !people) return <Loading />;
  const member = auth.roles.some((r) => r.org_id === b.project.org_id);
  const canEdit = member && auth.has(['project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison'], b.project.org_id);
  const st = STAGES.find((s) => s.key === b.project.stage)!;
  const refresh = async () => {
    await reload();
  };

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'home', label: 'Home' },
    { key: 'feedback', label: 'Feedback' },
    { key: 'tasks', label: 'To-do', count: b.tasks.filter((t) => t.status !== 'done').length },
    { key: 'files', label: 'Files' },
    { key: 'chat', label: 'Chat' },
    { key: 'community', label: 'Community' },
    { key: 'plan', label: 'Plan and budget' },
    { key: 'approvals', label: 'Approvals', count: b.proposals.length },
    { key: 'measures', label: 'Measurements', count: b.measurements.length },
    { key: 'obstacles', label: 'Obstacles', count: b.obstacles.length },
    { key: 'record', label: 'Record' },
    { key: 'evidence', label: 'Evidence', count: b.evidence.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/app/projects" className="text-sm font-bold text-ink-mute hover:text-ink">Projects</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{b.project.title}</h1>
            <p className="mt-1 text-ink-mute">{b.org.name}. {b.project.category}. Stage {st.n} of 6.</p>
            {b.project.scope === 'individual' && (
              <p className="mt-2 text-sm text-ink-soft">
                <Badge tone="sky">Individual project</Badge> Led by <b>{people[b.project.lead_person_id ?? ''] ?? 'a student'}</b>, mentored by <b>{people[b.project.mentor_person_id ?? ''] ?? 'a teacher'}</b>
                {b.project.successor_person_id && <>. Next up: <b>{people[b.project.successor_person_id] ?? 'a student'}</b></>}.
              </p>
            )}
            {b.source && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft">
                <GitFork className="h-4 w-4" /> Adapted from <Link to={`/app/library/${b.source.id}`} className="font-bold text-leaf-600 hover:underline">{b.source.title}</Link>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {b.project.status !== 'active' && <Badge tone={b.project.status === 'ended' ? 'lesson' : 'clay'}>{b.project.status[0].toUpperCase() + b.project.status.slice(1)}</Badge>}
            {canEdit && <StatusControl b={b} onChange={refresh} />}
          </div>
        </div>
      </div>

      <div>
        <Tabs label="Project sections" tabs={tabs} value={tab} onChange={(k) => setParams({ tab: k }, { replace: true })} />
        {tab === 'home' && (
          <div className="space-y-8">
            <HomeTab b={b} canEdit={canEdit} onChange={refresh} people={people} go={(k) => setParams({ tab: k }, { replace: true })} />
            <details className="rounded-panel border border-paper-line bg-white p-5">
              <summary className="cursor-pointer text-lg font-semibold">Your progress: stage {st.n} of 6, {st.name}</summary>
              <div className="mt-4 space-y-4">
                <StageRail current={b.project.stage} selected={stage ?? b.project.stage} onSelect={setStage} />
                {stage && <GatePanel key={stage + b.gates.length} b={b} stage={stage} onChange={async () => { await refresh(); setStage(null); }} people={people} />}
              </div>
            </details>
          </div>
        )}
        {tab === 'feedback' && <FeedbackTab b={b} />}
        {tab === 'files' && <FilesTab b={b} canEdit={member} people={people} />}
        {tab === 'chat' && <ChatTab b={b} />}
        {tab === 'community' && <CommunityTab b={b} />}
        {tab === 'plan' && <PlanTab b={b} canEdit={canEdit} onChange={refresh} />}
        {tab === 'tasks' && <TasksTab b={b} canEdit={canEdit} onChange={refresh} />}
        {tab === 'approvals' && <ApprovalsTab b={b} canEdit={canEdit} onChange={refresh} />}
        {tab === 'measures' && <MeasuresTab b={b} canEdit={canEdit} onChange={refresh} people={people} />}
        {tab === 'obstacles' && <ObstaclesTab b={b} canEdit={canEdit} onChange={refresh} />}
        {tab === 'record' && <RecordTab b={b} canEdit={canEdit} onChange={refresh} />}
        {tab === 'evidence' && <EvidenceTab b={b} canEdit={canEdit} onChange={refresh} />}
      </div>
    </div>
  );
}
