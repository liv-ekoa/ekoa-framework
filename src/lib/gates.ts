import { STAGES, type GateItem } from './ekoa';
import type { ProjectBundle } from './bundle';
import type { RoleKey, StageKey } from './types';

export interface GateCheck extends GateItem {
  ok: boolean;
  manualAllowed: boolean;
  hint: string;
}

const DAY = 86_400_000;

export function evaluateGate(stage: StageKey, b: ProjectBundle, manual: Record<string, boolean>): GateCheck[] {
  const def = STAGES.find((s) => s.key === stage)!;
  const nonBase = b.measurements.filter((m) => !m.is_baseline);
  return def.gate.map((item) => {
    let ok = false;
    let hint = '';
    let manualAllowed = false;
    switch (item.auto) {
      case 'baseline':
        ok = b.measurements.some((m) => m.is_baseline);
        hint = 'Log a baseline measurement in Metrics.';
        break;
      case 'problem':
        ok = b.project.problem.trim().length >= 40;
        hint = 'Write at least two sentences in the problem brief.';
        break;
      case 'targets':
        ok = b.targets.some((t) => t.baseline !== null && t.target !== null);
        hint = 'Set a baseline and a target for at least one metric.';
        break;
      case 'budget': {
        const zero = b.budgets.some((x) => x.source_type === 'zero_cost');
        ok = b.budgets.length > 0 && (zero || b.budgetLines.some((l) => l.planned > 0));
        hint = b.budgets.length ? 'Add at least one budget line with a planned amount, or mark the project zero-cost.' : 'Choose where the money comes from, then list what you will spend it on.';
        break;
      }
      case 'approval_route':
        ok = b.steps.length > 0;
        hint = 'Map the approval chain under My School.';
        break;
      case 'monitoring':
        ok = b.project.monitoring_plan.length > 0;
        hint = 'Add who measures what, and how often.';
        break;
      case 'risks':
        ok = b.project.risks.length > 0;
        hint = 'Add at least one risk and its mitigation.';
        break;
      case 'four_weeks': {
        const dates = nonBase.map((m) => new Date(m.period_end).getTime()).sort();
        ok = dates.length >= 4 && dates[dates.length - 1] - dates[0] >= 21 * DAY;
        hint = 'Keep logging weekly until you have four weeks of data.';
        break;
      }
      case 'approval_log':
        ok = b.proposals.length > 0 && b.proposals.every((p) => p.decision !== 'pending');
        hint = b.proposals.length ? 'A proposal is still waiting for a decision.' : 'Submit the proposal through the governance pathway.';
        break;
      case 'obstacles_or_none':
        manualAllowed = true;
        ok = b.obstacles.length > 0 || !!manual[item.key];
        hint = 'Log obstacles as they happen, or tick “No obstacles to report”.';
        break;
      case 'actuals': {
        const zero = b.budgets.some((x) => x.source_type === 'zero_cost');
        ok = zero || (b.budgetLines.length > 0 && b.budgetLines.every((l) => l.actual !== null));
        hint = 'Record what was actually spent on each budget line, even if it was nothing.';
        break;
      }
      case 'successor': {
        const lead = b.roles.filter((r) => r.role === 'project_lead');
        const incoming = lead.some((r) => r.status === 'incoming');
        const handedOver = b.handovers.some((h) => h.role === 'project_lead' && !!h.to_person_id);
        const coLeads = lead.filter((r) => r.status === 'active' || r.status === 'outgoing').length >= 2;
        ok = incoming || handedOver || coLeads;
        hint = 'Add an incoming Project Lead under My School, start a handover packet, or name a co-lead.';
        break;
      }
      case 'shared':
        ok = b.threads.length > 0;
        hint = 'Share the record draft with a circle.';
        break;
      case 'peer_comment': {
        const authors = new Set(b.posts.map((p) => p.person_id));
        ok = b.threads.some((t) => [...authors].some((a) => a !== t.created_by));
        hint = 'Wait for a peer from another school to comment, then reply.';
        break;
      }
      case 'outcome':
        ok = !!b.record && b.record.outcomes.length > 0;
        hint = 'Generate the record outcomes from your measurements.';
        break;
      case 'tier2': {
        const share = nonBase.length ? nonBase.filter((m) => m.tier >= 2).length / nonBase.length : 0;
        ok = share >= 0.7;
        hint = `${Math.round(share * 100)}% of measurements are T2 or higher; 70% is needed. Ask your faculty liaison to verify.`;
        break;
      }
      case 'outcome_class':
        ok = !!b.record && b.record.outcome_class !== 'too_early';
        hint = 'Choose worked, partly worked or did not work on the record.';
        break;
      case 'published':
        ok = b.record?.status === 'published';
        hint = 'Publish the record to the network or the public library.';
        break;
      default:
        manualAllowed = true;
        ok = !!manual[item.key];
    }
    return { ...item, ok, manualAllowed, hint };
  });
}

export function canSign(stage: StageKey, has: (r: RoleKey | RoleKey[], orgId?: string) => boolean, orgId: string) {
  const def = STAGES.find((s) => s.key === stage)!;
  if (def.signer === 'automatic') return false;
  return has([def.signer, 'faculty_liaison'], orgId);
}
