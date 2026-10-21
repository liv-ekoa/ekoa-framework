import * as api from './api';
import { STAGES, metricByCode } from './ekoa';
import { seriesFor } from './metrics';
import type { HandoverPacket, RoleKey, UUID } from './types';

/** Build the handover snapshot from live data: open projects, stalled approvals, latest metrics, lessons. */
export async function buildSnapshot(orgId: UUID): Promise<HandoverPacket['snapshot']> {
  const [projects, tasks, proposals, events, steps, ms, targets, obstacles, records] = await Promise.all([
    api.listProjects(orgId),
    Promise.all((await api.listProjects(orgId)).map((p) => api.listTasks(p.id))).then((x) => x.flat()),
    api.listProposals(),
    api.listApprovalEvents(),
    api.listSteps(orgId),
    api.listMeasurements(),
    api.listProjectMetrics(),
    api.listObstacles(),
    api.listRecords(),
  ]);
  const open = projects.filter((p) => p.status === 'active' || p.status === 'stalled' || p.status === 'paused');
  const stalled = proposals
    .filter((p) => p.decision === 'pending' && open.some((o) => o.id === p.project_id))
    .map((p) => {
      const ev = events.find((e) => e.proposal_id === p.id && e.decision === 'pending');
      const step = steps.find((s) => s.id === p.current_step_id);
      const days = ev ? Math.round((Date.now() - new Date(ev.entered_at).getTime()) / 86_400_000) : 0;
      return { proposal: p.title, step: step?.body ?? 'Unknown step', days };
    });
  const metrics = open.flatMap((p) =>
    targets
      .filter((t) => t.project_id === p.id)
      .map((t) => {
        const s = seriesFor(p.id, t.metric_code, ms, targets);
        const def = metricByCode(t.metric_code);
        return { project: p.title, metric: def?.name ?? t.metric_code, latest: s.latest ?? s.baseline, unit: def?.unit.startsWith('%') ? '%' : def?.unit ?? '' };
      }),
  );
  const lessons = [
    ...obstacles.filter((o) => open.some((p) => p.id === o.project_id) && o.resolution).map((o) => o.resolution),
    ...records.filter((r) => r.org_id === orgId && r.lessons).map((r) => r.lessons.split('. ')[0] + '.'),
  ].slice(0, 6);
  return {
    generated_at: new Date().toISOString(),
    projects: open.map((p) => {
      const todo = tasks.find((t) => t.project_id === p.id && t.status !== 'done');
      const stage = STAGES.find((s) => s.key === p.stage)!;
      return { id: p.id, title: p.title, stage: p.stage, status: p.status, next_step: todo ? todo.title : `Complete the ${stage.name} gate.` };
    }),
    stalled_approvals: stalled,
    metrics,
    lessons,
    contacts: (['faculty_liaison', 'ekoa_rep', 'approver'] as RoleKey[]).map((r) => ({ role: r, label: r === 'approver' ? 'Principal' : r === 'ekoa_rep' ? 'Ekoa Representative' : 'Faculty Liaison' })),
  };
}

export const HANDOVER_CHECKLIST: { key: string; label: string }[] = [
  { key: 'packet_reviewed', label: 'Incoming lead has read the packet' },
  { key: 'shadow_started', label: 'Shadow access started (incoming can read and comment)' },
  { key: 'meeting_held', label: 'Handover meeting held with the faculty liaison' },
  { key: 'archive_checked', label: 'Archive checked: every project has its evidence and records' },
];
