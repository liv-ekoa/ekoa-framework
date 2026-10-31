// Loads everything a project page needs in one go.
import * as api from './api';
import type {
  Adaptation, ApprovalEvent, BudgetLine, BudgetPathway, Evidence, HandoverPacket, RoleAssignment, GovernanceStep, ImplementationRecord, Measurement, Obstacle,
  Organisation, Post, Project, ProjectMetric, Proposal, StageGate, Task, Thread, UUID,
} from './types';

export interface ProjectBundle {
  project: Project;
  org: Organisation;
  gates: StageGate[];
  tasks: Task[];
  targets: ProjectMetric[];
  measurements: Measurement[];
  obstacles: Obstacle[];
  proposals: Proposal[];
  events: ApprovalEvent[];
  steps: GovernanceStep[];
  budgets: BudgetPathway[];
  budgetLines: BudgetLine[];
  /** The school's role assignments, used to check a successor is named. */
  roles: RoleAssignment[];
  handovers: HandoverPacket[];
  record: ImplementationRecord | null;
  source: ImplementationRecord | null;
  adaptation: Adaptation | null;
  threads: Thread[];
  posts: Post[];
  evidence: Evidence[];
}

export async function loadProjectBundle(id: UUID): Promise<ProjectBundle> {
  const project = await api.getProject(id);
  const [org, gates, tasks, targets, ms, obs, proposals, events, steps, budgets, records, adaptations, threads, posts, evidence, budgetLines, roles, handovers] = await Promise.all([
    api.getOrg(project.org_id),
    api.listGates(id),
    api.listTasks(id),
    api.listProjectMetrics(),
    api.listMeasurements(),
    api.listObstacles(),
    api.listProposals(),
    api.listApprovalEvents(),
    api.listSteps(project.org_id),
    api.listBudgets(),
    api.listRecords(),
    api.listAdaptations(),
    api.listThreads(),
    api.listPosts(),
    api.listEvidence(),
    api.listBudgetLines(id),
    api.listRolesForOrg(project.org_id),
    api.listHandovers(),
  ]);
  const myProposals = proposals.filter((p) => p.project_id === id);
  const record = records.find((r) => r.project_id === id) ?? null;
  const myThreads = threads.filter((t) => record && t.record_id === record.id);
  return {
    project,
    org,
    gates,
    tasks,
    targets: targets.filter((t) => t.project_id === id),
    measurements: ms.filter((m) => m.project_id === id),
    obstacles: obs.filter((o) => o.project_id === id),
    proposals: myProposals,
    events: events.filter((e) => myProposals.some((p) => p.id === e.proposal_id)),
    steps,
    budgets: budgets.filter((b) => b.project_id === id),
    budgetLines,
    roles,
    handovers: handovers.filter((h) => h.org_id === project.org_id),
    record,
    source: project.adapted_from_record_id ? records.find((r) => r.id === project.adapted_from_record_id) ?? null : null,
    adaptation: adaptations.find((a) => a.project_id === id) ?? null,
    threads: myThreads,
    posts: posts.filter((p) => myThreads.some((t) => t.id === p.thread_id)),
    evidence: evidence.filter((e) => e.project_id === id),
  };
}

export interface SchoolData {
  org: Organisation;
  projects: Project[];
  measurements: Measurement[];
  targets: ProjectMetric[];
  proposals: Proposal[];
  events: ApprovalEvent[];
  steps: GovernanceStep[];
  obstacles: Obstacle[];
  records: ImplementationRecord[];
  tasks: Task[];
  members: { role: import('./types').RoleAssignment; person: import('./types').Person }[];
  handovers: import('./types').HandoverPacket[];
}

export async function loadSchool(orgId: UUID): Promise<SchoolData> {
  const [org, projects, ms, targets, proposals, events, steps, obstacles, records, members, handovers] = await Promise.all([
    api.getOrg(orgId),
    api.listProjects(orgId),
    api.listMeasurements(),
    api.listProjectMetrics(),
    api.listProposals(),
    api.listApprovalEvents(),
    api.listSteps(orgId),
    api.listObstacles(),
    api.listRecords(),
    api.membersOf(orgId),
    api.listHandovers(),
  ]);
  const ids = new Set(projects.map((p) => p.id));
  const tasks = (await Promise.all(projects.map((p) => api.listTasks(p.id)))).flat();
  const props = proposals.filter((p) => ids.has(p.project_id));
  return {
    org,
    projects,
    measurements: ms.filter((m) => ids.has(m.project_id)),
    targets: targets.filter((t) => ids.has(t.project_id)),
    proposals: props,
    events: events.filter((e) => props.some((p) => p.id === e.proposal_id)),
    steps,
    obstacles: obstacles.filter((o) => ids.has(o.project_id)),
    records: records.filter((r) => r.org_id === orgId),
    tasks,
    members,
    handovers: handovers.filter((h) => h.org_id === orgId),
  };
}

export interface Alert { tone: 'alert' | 'clay' | 'sky'; text: string; to: string }

/** Continuity and data alerts for a school, as described in the build outline (M8). */
export function schoolAlerts(s: SchoolData, opts: { isLiaison: boolean; personId?: string }): Alert[] {
  const out: Alert[] = [];
  const DAY = 86_400_000;
  const now = Date.now();
  for (const m of s.members) {
    if (m.role.status !== 'active' || !m.role.term_end || m.role.role === 'faculty_liaison' || m.role.role === 'approver') continue;
    const days = Math.ceil((new Date(m.role.term_end).getTime() - now) / DAY);
    if (days >= 0 && days <= 56) {
      const packet = s.handovers.find((h) => h.from_person_id === m.person.id && h.role === m.role.role);
      out.push({ tone: packet ? 'sky' : 'clay', text: `${m.person.id === opts.personId ? 'Your' : `${m.person.display_name}’s`} term as ${m.role.role.replace(/_/g, ' ')} ends in ${days} days. ${packet ? 'Handover packet started.' : 'Start the handover packet.'}`, to: '/app/handover' });
    }
  }
  for (const role of ['project_lead', 'ekoa_rep', 'faculty_liaison'] as const) {
    if (!s.members.some((m) => m.role.role === role && (m.role.status === 'active' || m.role.status === 'outgoing'))) {
      out.push({ tone: 'alert', text: `No active ${role.replace(/_/g, ' ')}. Fill the role so the school keeps its link to the network.`, to: '/app/school' });
    }
  }
  for (const p of s.projects.filter((x) => x.status === 'active')) {
    const last = Math.max(new Date(p.updated_at).getTime(), ...s.measurements.filter((m) => m.project_id === p.id).map((m) => new Date(m.created_at).getTime()));
    if (now - last > 30 * DAY) out.push({ tone: 'clay', text: `“${p.title}” has had no activity for ${Math.round((now - last) / DAY)} days.`, to: `/app/projects/${p.id}` });
    for (const plan of p.monitoring_plan) {
      if (!/week/i.test(plan.frequency)) continue;
      const lastM = s.measurements.filter((m) => m.project_id === p.id && m.metric_code === plan.metric_code).map((m) => new Date(m.period_end).getTime());
      if (p.stage !== 'identify' && lastM.length && now - Math.max(...lastM) > 9 * DAY) {
        out.push({ tone: 'clay', text: `Weekly measurement due for “${p.title}”.`, to: '/app/log' });
        break;
      }
    }
  }
  for (const pr of s.proposals.filter((x) => x.decision === 'pending')) {
    const ev = s.events.find((e) => e.proposal_id === pr.id && e.decision === 'pending');
    const step = s.steps.find((x) => x.id === pr.current_step_id);
    if (ev && step) {
      const days = Math.round((now - new Date(ev.entered_at).getTime()) / DAY);
      if (days > step.typical_days) out.push({ tone: 'alert', text: `“${pr.title}” has waited ${days} days at ${step.body} (typical: ${step.typical_days}).`, to: '/app/governance' });
    }
  }
  if (opts.isLiaison) {
    const pending = s.members.filter((m) => m.person.consent_status === 'pending');
    if (pending.length) out.push({ tone: 'sky', text: `${pending.length} student ${pending.length === 1 ? 'account is' : 'accounts are'} waiting for guardian consent.`, to: '/app/school?tab=people' });
    const unverified = s.measurements.filter((m) => m.tier < 2 && !m.is_baseline).length;
    if (unverified) out.push({ tone: 'sky', text: `${unverified} measurements are waiting for your verification.`, to: '/app/projects?view=metrics&tab=verify' });
  }
  return out;
}
