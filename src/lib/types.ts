// Shared data types. Field names match the Postgres columns in supabase/migrations.

export type UUID = string;

/** independent: the private workspace of a student who joined Ekoa without their school. */
export type OrgType = 'school' | 'partner' | 'ekoa' | 'independent';
export type AgeBand = '13-15' | '16-17' | '18+';
export type ConsentStatus = 'not_needed' | 'pending' | 'granted' | 'withdrawn';

export type RoleKey =
  | 'project_lead'
  | 'board_member'
  | 'implementation_team'
  | 'ekoa_rep'
  | 'faculty_liaison'
  | 'approver'
  | 'auditor'
  | 'steward'
  | 'partner'
  | 'alumni';

export type TermStatus = 'incoming' | 'active' | 'outgoing' | 'alumni';

export type StageKey = 'identify' | 'design' | 'implement' | 'collaborate' | 'measure' | 'scale';
export type ProjectStatus = 'active' | 'stalled' | 'paused' | 'completed' | 'ended';
export type OutcomeClass = 'worked' | 'partly' | 'did_not_work' | 'too_early';
export type Tier = 0 | 1 | 2 | 3 | 4;
export type Visibility = 'school' | 'network' | 'public';

export interface ContextProfile {
  size_band: string; // e.g. "1,500–2,000"
  curriculum: string; // e.g. "CBSE"
  climate_zone: string; // e.g. "Hot semi-arid"
  budget_band: 'zero' | 'low' | 'medium' | 'high';
  infrastructure: string[]; // e.g. ["canteen", "garden space"]
  waste_contractor: string;
  governance_chain_length: number;
}

export interface Organisation {
  id: UUID;
  name: string;
  org_type: OrgType;
  country: string;
  city: string;
  lat: number | null;
  lng: number | null;
  curriculum: string | null;
  student_count: number | null;
  grade_range: string | null;
  climate_zone: string | null;
  context_profile: ContextProfile | null;
  status: 'applied' | 'onboarding' | 'active' | 'paused';
  public_visible: boolean;
  anonymised_label: string | null;
  /** Ekoa audit schools carry out T3 peer audits of other schools' records. */
  audit_school: boolean;
  /** For an independent student's workspace: the school they attend, which is not on Ekoa yet. */
  school_name?: string;
  created_at: string;
}

export interface Person {
  id: UUID;
  auth_user_id: string | null;
  display_name: string;
  email: string;
  age_band: AgeBand;
  is_minor: boolean;
  locale: string;
  consent_status: ConsentStatus;
  created_at: string;
}

export interface ConsentRecord {
  id: UUID;
  person_id: UUID;
  guardian_name: string;
  guardian_email: string;
  scope: { account: boolean; cross_school: boolean; photos: boolean; name_on_records: boolean };
  method: 'email_link' | 'paper_upload';
  terms_version: string;
  token: string;
  granted_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
}

export interface RoleAssignment {
  id: UUID;
  person_id: UUID;
  org_id: UUID;
  role: RoleKey;
  seat: number | null; // board seat for staggered rotation
  /** What the school calls this role, e.g. "Eco Club President". */
  local_title: string | null;
  term_start: string;
  term_end: string | null;
  status: TermStatus;
}

export interface Cohort { id: UUID; name: string; starts_on: string; ends_on: string | null }
export interface CohortMember { id: UUID; cohort_id: UUID; org_id: UUID }
export interface Circle { id: UUID; name: string; theme: string; description: string }
export interface CircleMember { id: UUID; circle_id: UUID; person_id: UUID }

export interface Thread {
  id: UUID;
  kind: 'circle' | 'partner_request' | 'twin';
  circle_id: UUID | null;
  org_id: UUID | null;
  /** Second school in a twin or introduction thread. */
  org_b: UUID | null;
  record_id: UUID | null;
  title: string;
  created_by: UUID;
  created_at: string;
  status: 'open' | 'answered' | 'closed';
}

export interface Post {
  id: UUID;
  thread_id: UUID;
  person_id: UUID;
  /** Copied from the author at posting time, so readers never need other schools' member lists. */
  author_name: string;
  author_role: string;
  author_org: string;
  author_is_minor: boolean;
  body: string;
  created_at: string;
  flagged: boolean;
  hidden: boolean;
  /** Why the safety filter hid it, if it did. */
  flag_reason?: string | null;
}

export interface MonitoringItem { metric_code: string; who: RoleKey; frequency: string }
export interface Risk { text: string; mitigation: string }

export interface Project {
  id: UUID;
  org_id: UUID;
  title: string;
  category: string;
  stage: StageKey;
  status: ProjectStatus;
  owner_role: RoleKey;
  template_key: string | null;
  starts_on: string;
  ends_on: string | null;
  adapted_from_record_id: UUID | null;
  problem: string;
  solution: string;
  monitoring_plan: MonitoringItem[];
  risks: Risk[];
  created_at: string;
  updated_at: string;
}

export interface StageGate {
  id: UUID;
  project_id: UUID;
  stage: StageKey;
  checklist: Record<string, boolean>;
  signed_by: UUID | null;
  signed_at: string | null;
}

export interface Task {
  id: UUID;
  project_id: UUID;
  title: string;
  owner_role: RoleKey;
  status: 'todo' | 'doing' | 'done';
  due_on: string | null;
}

export interface GovernanceStep {
  id: UUID;
  org_id: UUID;
  position: number;
  body: string;
  decision_rights: string;
  budget_limit: number | null;
  typical_days: number;
}

export interface Proposal {
  id: UUID;
  project_id: UUID;
  title: string;
  ask: string;
  submitted_at: string;
  current_step_id: UUID | null;
  decision: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  decided_at: string | null;
}

export interface ApprovalEvent {
  id: UUID;
  proposal_id: UUID;
  step_id: UUID;
  entered_at: string;
  decided_at: string | null;
  decision: 'pending' | 'passed' | 'returned' | 'rejected';
  notes: string;
}

export interface BudgetPathway {
  id: UUID;
  project_id: UUID;
  source_type: 'school_budget' | 'parent_association' | 'grant' | 'sponsor' | 'zero_cost';
  amount: number;
  currency: string;
  approver: string;
  status: 'planned' | 'requested' | 'approved' | 'released' | 'refused';
  rigidity_notes: string;
}

export type BudgetCategory = 'materials' | 'equipment' | 'services' | 'printing' | 'transport' | 'food' | 'other';

export interface BudgetLine {
  id: UUID;
  project_id: UUID;
  category: BudgetCategory;
  item: string;
  planned: number;
  /** Filled in during Implement; null until the money is spent. */
  actual: number | null;
  currency: string;
  note: string;
}

export interface MetricInput { key: string; label: string; unit: string }

export interface MetricDefinition {
  code: string;
  name: string;
  unit: string;
  category: 'waste' | 'energy' | 'water' | 'food' | 'participation' | 'cost';
  protocol: string;
  frequency: string;
  comparability_notes: string;
  higher_is_better: boolean;
  is_impact: boolean;
  inputs: MetricInput[];
  version: number;
}

export interface ProjectMetric {
  id: UUID;
  project_id: UUID;
  metric_code: string;
  baseline: number | null;
  target: number | null;
}

export interface Measurement {
  id: UUID;
  project_id: UUID;
  metric_code: string;
  value: number;
  raw: Record<string, number>;
  period_start: string;
  period_end: string;
  is_baseline: boolean;
  method: string;
  entered_by: UUID;
  entered_role: RoleKey;
  tier: Tier;
  evidence_id: UUID | null;
  replaces_id: UUID | null;
  created_at: string;
}

export interface Obstacle {
  id: UUID;
  project_id: UUID;
  stage: StageKey;
  category: string;
  subcategory: string;
  severity: 'blocked' | 'delayed' | 'minor';
  started_on: string;
  resolved_on: string | null;
  resolution: string;
  description: string;
}

export interface RecordOutcome {
  metric_code: string;
  baseline: number;
  result: number;
  tier: Tier;
}

export interface ImplementationRecord {
  id: UUID;
  project_id: UUID | null;
  org_id: UUID;
  version: number;
  title: string;
  summary: string;
  category: string;
  context: ContextProfile & { country: string; city: string; descriptor: string };
  problem: string;
  intervention: string;
  timeline: string;
  budget_summary: string;
  /** Actual spend converted to USD, for comparing records across countries. */
  budget_amount_usd: number;
  budget_planned: number;
  budget_actual: number;
  budget_currency: string;
  budget_lines: { category: BudgetCategory; planned: number; actual: number }[];
  approval_summary: { body: string; days: number }[];
  obstacles: { category: string; note: string }[];
  outcomes: RecordOutcome[];
  outcome_class: OutcomeClass;
  tier: Tier;
  lessons: string;
  materials: { name: string; kind: string }[];
  contributors: string[];
  visibility: Visibility;
  anonymised: boolean;
  ai_drafted: boolean;
  status: 'draft' | 'in_review' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Adaptation {
  id: UUID;
  source_record_id: UUID;
  project_id: UUID;
  /** The adapting school, copied from the project so other schools can see who reused a model. */
  org_id: UUID | null;
  differences: Record<string, string>;
  notes: string;
  result: OutcomeClass | null;
  created_at: string;
}

export interface PolicySection { key: string; title: string; body: string; clause_id: UUID | null }

export interface Policy {
  id: UUID;
  org_id: UUID;
  title: string;
  version: number;
  status: 'draft' | 'internal_review' | 'approved' | 'adopted' | 'amended';
  sections: PolicySection[];
  adopted_at: string | null;
  updated_at: string;
}

/** An adopted policy as anyone can read it, from the public_policies view. */
export interface PublicPolicy {
  id: UUID;
  title: string;
  version: number;
  status: 'adopted' | 'amended';
  sections: PolicySection[];
  adopted_at: string | null;
  updated_at: string;
  is_model: boolean;
  school: string;
  org_id: UUID | null;
  city: string;
  country: string;
}

export interface PolicyAmendment { id: UUID; policy_id: UUID; summary: string; adopted_on: string }

export interface PolicyClause {
  id: UUID;
  section: string;
  title: string;
  body: string;
  source_org_id: UUID | null;
  adoption_count: number;
}

export interface Evidence {
  id: UUID;
  org_id: UUID;
  project_id: UUID | null;
  file_name: string;
  file_type: string;
  data_url: string | null;
  storage_path: string | null;
  contains_people: boolean;
  consent_checked: boolean;
  exif_stripped: boolean;
  caption: string;
  /** Hidden from students while a teacher reviews a report about it. */
  hidden?: boolean;
  created_at: string;
}

export interface HandoverPacket {
  id: UUID;
  org_id: UUID;
  role: RoleKey;
  from_person_id: UUID;
  to_person_id: UUID | null;
  snapshot: {
    generated_at: string;
    projects: { id: UUID; title: string; stage: StageKey; status: ProjectStatus; next_step: string }[];
    stalled_approvals: { proposal: string; step: string; days: number }[];
    metrics: { project: string; metric: string; latest: number | null; unit: string }[];
    lessons: string[];
    contacts: { role: RoleKey; label: string }[];
  };
  checklist: Record<string, boolean>;
  note: string;
  signed_out_at: string | null;
  signed_in_at: string | null;
  signed_liaison_at: string | null;
  term_switch_on: string;
  created_at: string;
}

export interface Campaign {
  id: UUID;
  name: string;
  description: string;
  starts_on: string;
  ends_on: string;
  metric_code: string;
  protocol: string;
  sponsor: string | null;
}
export interface CampaignParticipant { id: UUID; campaign_id: UUID; org_id: UUID; baseline: number | null; latest: number | null }

export interface EventItem {
  id: UUID;
  title: string;
  kind: 'circle_call' | 'cohort_call' | 'workshop' | 'climate_cafe';
  starts_at: string;
  circle_id: UUID | null;
  description: string;
  adults_present: string[];
  recorded: boolean;
}

/** Anything reported, or caught by the safety filter. It is hidden at once until an adult decides. */
export interface ContentFlag {
  id: UUID;
  target_kind: 'post' | 'evidence' | 'policy_link' | 'upload';
  target_id: UUID;
  org_id: UUID | null;
  reason: 'self_harm' | 'violence' | 'hate' | 'sexual' | 'bullying' | 'contact' | 'other';
  source: 'filter' | 'report';
  reporter_person_id: UUID | null;
  excerpt: string;
  note: string;
  status: 'open' | 'removed' | 'restored';
  decided_by: UUID | null;
  decided_at: string | null;
  created_at: string;
}

/** A helpful link (a Google Doc, a template, an article) added to a school's policy by any member. */
export interface PolicyLink {
  id: UUID;
  policy_id: UUID;
  org_id: UUID;
  url: string;
  title: string;
  note: string;
  added_by: UUID | null;
  added_by_name: string;
  hidden: boolean;
  created_at: string;
}

/** Another school whose policy is like yours, from public.collaborator_suggestions. */
export interface CollaboratorSuggestion {
  org_id: UUID;
  name: string;
  city: string;
  country: string;
  /** 0 to 1. */
  score: number;
  shared_clauses: string[];
  shared_sections: string[];
  shared_terms: string[];
}

export interface Application {
  id: UUID;
  name: string;
  email: string;
  organisation: string;
  country: string;
  role: string;
  message: string;
  /** Does the school already have someone leading sustainability work? */
  has_lead: 'yes' | 'eco_club' | 'no' | '';
  lead_plan: string;
  status: 'new' | 'contacted' | 'call_booked' | 'agreement_sent' | 'onboarded' | 'declined';
  notes: string;
  /** school: a school registering; students: a school's liaison sending more student emails. */
  kind?: 'school' | 'students' | 'other';
  /** The school, once it exists on Ekoa. */
  org_id?: UUID | null;
  /** Student emails the school listed, for Ekoa admins to give roles to. */
  student_emails?: string[];
  created_at: string;
}

export interface SafeguardingReport {
  id: UUID;
  reporter_person_id: UUID | null;
  reporter_contact: string;
  subject_ref: string;
  category: 'contact' | 'content' | 'privacy' | 'wellbeing' | 'other';
  details: string;
  status: 'new' | 'triaged' | 'escalated' | 'resolved';
  assigned_to: string;
  actions: { at: string; note: string }[];
  created_at: string;
}

export interface AuditEntry {
  id: UUID;
  actor_person_id: UUID | null;
  action: string;
  entity: string;
  entity_id: string;
  meta: Record<string, unknown>;
  at: string;
}

export interface Verification {
  id: UUID;
  record_id: UUID;
  requested_tier: Tier;
  requested_by_org: UUID;
  verifier_org: UUID | null;
  status: 'requested' | 'in_progress' | 'verified' | 'declined';
  notes: string;
  created_at: string;
}

export interface Session {
  person: Person;
  roles: RoleAssignment[];
  orgs: Organisation[];
  activeOrgId: UUID | null;
}
