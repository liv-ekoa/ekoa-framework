// Every read and write the app makes goes through this file.
import { db, must, supabase, uuid } from './db';
import { config } from './config';
import { METRIC_LIBRARY, nextStage, templateByKey } from './ekoa';
import type {
  Adaptation, Application, ApprovalEvent, AuditEntry, BudgetLine, BudgetPathway, Campaign, CampaignParticipant,
  Circle, CircleMember, Cohort, CohortMember, ConsentRecord, EventItem, Evidence, GovernanceStep,
  HandoverPacket, ImplementationRecord, LibraryPolicy, LibraryPolicySubmission, Measurement, MetricDefinition, Obstacle, Organisation, Person,
  Policy, PolicyAmendment, PolicyClause, Post, Project, ProjectMetric, Proposal, RoleAssignment, RoleKey,
  SafeguardingReport, StageGate, StageKey, Task, Thread, Tier, Twin, UUID, Verification,
} from './types';

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

// ---------------- Audit ----------------
export async function audit(actor: UUID | null, action: string, entity: string, entityId = '', meta: Record<string, unknown> = {}) {
  await db.from('audit_log').insert({ actor_person_id: actor, action, entity, entity_id: entityId, meta, at: nowIso() });
}
export const listAudit = () => must<AuditEntry[]>(db.from('audit_log').select('*').order('at', { ascending: false }).limit(200));

// ---------------- Organisations ----------------
export const listOrgs = (type?: Organisation['org_type']) =>
  type ? must<Organisation[]>(db.from('organisations').select('*').eq('org_type', type).order('name')) : must<Organisation[]>(db.from('organisations').select('*').order('name'));
export const getOrg = (id: UUID) => must<Organisation>(db.from('organisations').select('*').eq('id', id).single());
export const updateOrg = (id: UUID, patch: Partial<Organisation>) => must(db.from('organisations').update(patch).eq('id', id));
export const createOrg = (row: Partial<Organisation>) => must<Organisation>(db.from('organisations').insert(row).select().single());

// ---------------- People, roles, consent ----------------
export const listPeople = () => must<Person[]>(db.from('people').select('*').order('display_name'));
export const getPerson = (id: UUID) => must<Person>(db.from('people').select('*').eq('id', id).single());
export const listRolesForOrg = (orgId: UUID) => must<RoleAssignment[]>(db.from('role_assignments').select('*').eq('org_id', orgId));
export const listRolesForPerson = (personId: UUID) => must<RoleAssignment[]>(db.from('role_assignments').select('*').eq('person_id', personId));
export const listAllRoles = () => must<RoleAssignment[]>(db.from('role_assignments').select('*'));
export const updateRole = (id: UUID, patch: Partial<RoleAssignment>) => must(db.from('role_assignments').update(patch).eq('id', id));

export async function membersOf(orgId: UUID) {
  const roles = await listRolesForOrg(orgId);
  const people = await listPeople();
  return roles
    .map((r) => ({ role: r, person: people.find((p) => p.id === r.person_id)! }))
    .filter((m) => m.person);
}

export async function inviteMember(
  orgId: UUID,
  input: { name: string; email: string; age_band: Person['age_band']; role: RoleKey; term_end: string | null; local_title?: string; guardian_name?: string; guardian_email?: string },
  actor: UUID,
) {
  const minor = input.age_band !== '18+';
  // The id is made here because the new person is not readable until their role exists.
  const id = uuid();
  const { error } = await db.from('people').insert({
    id, display_name: input.name.trim(), email: input.email.trim().toLowerCase(), age_band: input.age_band, is_minor: minor,
    locale: 'en', consent_status: minor ? 'pending' : 'not_needed',
  });
  if (error) throw new Error(error.message.includes('duplicate key') ? 'Someone with this email is already on Ekoa. Ask an Ekoa steward to add them to your school.' : error.message);
  await must(db.from('role_assignments').insert({
    person_id: id, org_id: orgId, role: input.role, seat: null, local_title: input.local_title?.trim() || null, term_start: today(), term_end: input.term_end, status: 'active',
  }));
  let consentToken: string | null = null;
  if (minor) {
    // The database makes the token.
    const rec = await must<{ token: string }>(
      db.from('consent_records').insert({
        person_id: id, guardian_name: input.guardian_name?.trim() ?? '', guardian_email: input.guardian_email?.trim().toLowerCase() ?? '',
        scope: { account: false, cross_school: false, photos: false, name_on_records: false }, method: 'email_link', terms_version: config.termsVersion,
      }).select('token').single(),
    );
    consentToken = rec.token;
  }
  await audit(actor, `invited ${input.role}`, 'people', id);
  if (consentToken) {
    // Emails the guardian their consent link once the send-consent function is deployed.
    await supabase.functions.invoke('send-consent', { body: { person_id: id } }).catch(() => undefined);
  }
  const person = await getPerson(id);
  return { person, consentToken };
}

/** Give an existing member another role, e.g. the Project Lead who is also the Ekoa Representative at a small school. */
export async function addRole(orgId: UUID, personId: UUID, role: RoleKey, localTitle: string, termEnd: string | null, actor: UUID) {
  const existing = (await listRolesForOrg(orgId)).find((r) => r.person_id === personId && r.role === role && r.status !== 'alumni');
  if (existing) throw new Error('They already hold this role.');
  await must(db.from('role_assignments').insert({ person_id: personId, org_id: orgId, role, seat: null, local_title: localTitle.trim() || null, term_start: today(), term_end: termEnd, status: 'active' }));
  await audit(actor, `added role ${role}`, 'role_assignments', personId);
}

export const listConsents = () => must<ConsentRecord[]>(db.from('consent_records').select('*'));

/** Guardians are not signed in, so consent goes through two narrow database functions. */
export async function lookupConsent(token: string): Promise<{ firstName: string; scope: ConsentRecord['scope']; granted: boolean } | null> {
  const { data, error } = await supabase.rpc('consent_lookup', { p_token: token });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { first_name: string; scope: ConsentRecord['scope']; granted: boolean } | undefined;
  return row ? { firstName: row.first_name, scope: row.scope, granted: row.granted } : null;
}

export async function grantConsent(token: string, guardianName: string, scope: ConsentRecord['scope']) {
  const { error } = await supabase.rpc('grant_consent', { p_token: token, p_guardian_name: guardianName, p_scope: scope });
  if (error) throw new Error(error.message.includes('invalid') ? 'This consent link is not valid. Ask the school for a new one.' : error.message);
}
export async function withdrawConsent() {
  const { error } = await supabase.rpc('withdraw_my_consent');
  if (error) throw new Error(error.message);
}

// ---------------- Cohorts ----------------
export const listCohorts = () => must<Cohort[]>(db.from('cohorts').select('*').order('starts_on'));
export const listCohortMembers = () => must<CohortMember[]>(db.from('cohort_members').select('*'));

// ---------------- Projects ----------------
export const listProjects = (orgId?: UUID) =>
  orgId
    ? must<Project[]>(db.from('projects').select('*').eq('org_id', orgId).order('updated_at', { ascending: false }))
    : must<Project[]>(db.from('projects').select('*').order('updated_at', { ascending: false }));
export const getProject = (id: UUID) => must<Project>(db.from('projects').select('*').eq('id', id).single());
export const updateProject = (id: UUID, patch: Partial<Project>) => must(db.from('projects').update({ ...patch, updated_at: nowIso() }).eq('id', id));

export async function createProject(
  orgId: UUID,
  input: { title: string; category: string; template_key: string | null; adapted_from_record_id?: UUID | null; problem?: string },
  actor: UUID,
) {
  const t = templateByKey(input.template_key);
  const project = await must<Project>(
    db.from('projects').insert({
      org_id: orgId, title: input.title, category: input.category, stage: 'identify', status: 'active',
      owner_role: 'project_lead', template_key: input.template_key, starts_on: today(), ends_on: null,
      adapted_from_record_id: input.adapted_from_record_id ?? null, problem: input.problem ?? '', solution: '',
      monitoring_plan: t?.monitoring ?? [], risks: t?.risks ?? [], updated_at: nowIso(),
    }).select().single(),
  );
  if (t) {
    await must(db.from('tasks').insert(t.tasks.map((k) => ({ project_id: project.id, title: k.title, owner_role: k.owner, status: 'todo', due_on: null }))));
    await must(db.from('project_metrics').insert(t.metrics.map((m) => ({ project_id: project.id, metric_code: m, baseline: null, target: null }))));
  }
  await audit(actor, 'created project', 'projects', project.id);
  return project;
}

export const listGates = (projectId: UUID) => must<StageGate[]>(db.from('stage_gates').select('*').eq('project_id', projectId));
export async function signGate(project: Project, stage: StageKey, personId: UUID, checklist: Record<string, boolean>) {
  // The database checks who may sign, stamps the signer, and only then lets the stage move on.
  await must(db.from('stage_gates').insert({ project_id: project.id, stage, checklist, signed_by: personId, signed_at: nowIso() }));
  const next = nextStage(stage);
  if (next) await updateProject(project.id, { stage: next });
  await audit(personId, `signed gate: ${stage}`, 'stage_gates', project.id);
}

export async function setProjectStatus(project: Project, status: Project['status'], actor: UUID) {
  await updateProject(project.id, { status, ends_on: status === 'ended' || status === 'completed' ? today() : null });
  await audit(actor, `project status: ${status}`, 'projects', project.id);
}

// ---------------- Tasks ----------------
export const listTasks = (projectId: UUID) => must<Task[]>(db.from('tasks').select('*').eq('project_id', projectId));
export const addTask = (row: Omit<Task, 'id'>) => must(db.from('tasks').insert(row));
export const updateTask = (id: UUID, patch: Partial<Task>) => must(db.from('tasks').update(patch).eq('id', id));
export const deleteTask = (id: UUID) => must(db.from('tasks').delete().eq('id', id));

// ---------------- Governance ----------------
export const listSteps = (orgId: UUID) => must<GovernanceStep[]>(db.from('governance_steps').select('*').eq('org_id', orgId).order('position'));
/** Updates steps in place so approval history keeps pointing at the right step. */
export async function saveSteps(orgId: UUID, steps: Omit<GovernanceStep, 'id' | 'org_id'>[]) {
  const existing = await listSteps(orgId);
  for (let i = 0; i < steps.length; i++) {
    const row = { body: steps[i].body, decision_rights: steps[i].decision_rights, budget_limit: steps[i].budget_limit, typical_days: steps[i].typical_days, position: i + 1 };
    if (existing[i]) await must(db.from('governance_steps').update(row).eq('id', existing[i].id));
    else await must(db.from('governance_steps').insert({ ...row, org_id: orgId }));
  }
  const events = await listApprovalEvents();
  for (const extra of existing.slice(steps.length)) {
    if (events.some((e) => e.step_id === extra.id)) throw new Error(`“${extra.body}” has approval history, so it cannot be removed. Rename it instead.`);
    await must(db.from('governance_steps').delete().eq('id', extra.id));
  }
}
export const listProposals = () => must<Proposal[]>(db.from('proposals').select('*').order('submitted_at', { ascending: false }));
export const listApprovalEvents = () => must<ApprovalEvent[]>(db.from('approval_events').select('*').order('entered_at'));

export async function createProposal(project: Project, title: string, ask: string, actor: UUID) {
  const steps = await listSteps(project.org_id);
  if (!steps.length) throw new Error('Map your approval chain under My School before submitting a proposal.');
  const proposal = await must<Proposal>(
    db.from('proposals').insert({ project_id: project.id, title, ask, submitted_at: nowIso(), current_step_id: steps[0].id, decision: 'pending', decided_at: null }).select().single(),
  );
  await must(db.from('approval_events').insert({ proposal_id: proposal.id, step_id: steps[0].id, entered_at: nowIso(), decided_at: null, decision: 'pending', notes: '' }));
  await audit(actor, 'submitted proposal', 'proposals', proposal.id);
  return proposal;
}

/** Record a decision at the current step; passing moves the proposal to the next step. */
export async function decideStep(proposal: Proposal, decision: 'passed' | 'returned' | 'rejected', notes: string, actor: UUID) {
  const project = await getProject(proposal.project_id);
  const steps = await listSteps(project.org_id);
  const events = (await listApprovalEvents()).filter((e) => e.proposal_id === proposal.id);
  const open = events.find((e) => e.decision === 'pending');
  if (open) await must(db.from('approval_events').update({ decision, decided_at: nowIso(), notes }).eq('id', open.id));
  const idx = steps.findIndex((s) => s.id === proposal.current_step_id);
  if (decision === 'passed') {
    const next = steps[idx + 1];
    if (next) {
      await must(db.from('approval_events').insert({ proposal_id: proposal.id, step_id: next.id, entered_at: nowIso(), decided_at: null, decision: 'pending', notes: '' }));
      await must(db.from('proposals').update({ current_step_id: next.id }).eq('id', proposal.id));
    } else {
      await must(db.from('proposals').update({ decision: 'approved', decided_at: nowIso(), current_step_id: null }).eq('id', proposal.id));
    }
  } else if (decision === 'rejected') {
    await must(db.from('proposals').update({ decision: 'rejected', decided_at: nowIso(), current_step_id: null }).eq('id', proposal.id));
  } else {
    // Returned: back to the first step for resubmission.
    await must(db.from('approval_events').insert({ proposal_id: proposal.id, step_id: steps[0].id, entered_at: nowIso(), decided_at: null, decision: 'pending', notes: 'Resubmitted after changes' }));
    await must(db.from('proposals').update({ current_step_id: steps[0].id }).eq('id', proposal.id));
  }
  await audit(actor, `approval step ${decision}`, 'proposals', proposal.id);
}

// ---------------- Budget ----------------
export const listBudgetLines = (projectId?: UUID) =>
  must<BudgetLine[]>(projectId ? db.from('budget_lines').select('*').eq('project_id', projectId) : db.from('budget_lines').select('*'));
export async function saveBudgetLine(row: Partial<BudgetLine> & { project_id: UUID }) {
  if (row.id) return must(db.from('budget_lines').update(row).eq('id', row.id));
  return must(db.from('budget_lines').insert(row));
}
export const deleteBudgetLine = (id: UUID) => must(db.from('budget_lines').delete().eq('id', id));
export const listBudgets = () => must<BudgetPathway[]>(db.from('budget_pathways').select('*'));
export async function saveBudget(row: Partial<BudgetPathway> & { project_id: UUID }) {
  if (row.id) return must(db.from('budget_pathways').update(row).eq('id', row.id));
  return must(db.from('budget_pathways').insert(row));
}

// ---------------- Metrics and measurements ----------------
export async function listMetricDefs(): Promise<MetricDefinition[]> {
  const rows = await must<MetricDefinition[]>(db.from('metric_definitions').select('*').order('code'));
  return rows.length ? rows : METRIC_LIBRARY;
}
export const upsertMetricDef = (m: MetricDefinition) => must(db.from('metric_definitions').upsert(m));
export const listProjectMetrics = () => must<ProjectMetric[]>(db.from('project_metrics').select('*'));
export async function setProjectMetric(projectId: UUID, code: string, patch: { baseline?: number | null; target?: number | null }) {
  const rows = (await listProjectMetrics()).filter((r) => r.project_id === projectId && r.metric_code === code);
  if (rows.length) return must(db.from('project_metrics').update(patch).eq('id', rows[0].id));
  return must(db.from('project_metrics').insert({ project_id: projectId, metric_code: code, baseline: null, target: null, ...patch }));
}
export const removeProjectMetric = (id: UUID) => must(db.from('project_metrics').delete().eq('id', id));
export const listMeasurements = () => must<Measurement[]>(db.from('measurements').select('*').order('period_end'));
export async function addMeasurement(row: Omit<Measurement, 'id' | 'created_at'>) {
  const m = await must<Measurement>(db.from('measurements').insert(row).select().single());
  if (row.is_baseline) await setProjectMetric(row.project_id, row.metric_code, { baseline: row.value });
  await updateProject(row.project_id, {});
  return m;
}
export async function verifyMeasurements(ids: UUID[], tier: Tier, actor: UUID) {
  for (const id of ids) await must(db.from('measurements').update({ tier }).eq('id', id));
  await audit(actor, `verified ${ids.length} measurements to T${tier}`, 'measurements');
}

// ---------------- Obstacles ----------------
export const listObstacles = () => must<Obstacle[]>(db.from('obstacles').select('*').order('started_on', { ascending: false }));
export const addObstacle = (row: Omit<Obstacle, 'id'>) => must(db.from('obstacles').insert(row));
export const updateObstacle = (id: UUID, patch: Partial<Obstacle>) => must(db.from('obstacles').update(patch).eq('id', id));

// ---------------- Library policies ----------------
/** Approved policies only. Visitors can read this without signing in. */
export const listPublicPolicies = () => must<LibraryPolicy[]>(db.from('public_policies').select('*').order('created_at', { ascending: false }));
/** Your own submissions, or every submission for a steward. */
export const listPolicySubmissions = () => must<LibraryPolicySubmission[]>(db.from('library_policies').select('*').order('created_at', { ascending: false }));
export const submitPolicy = (row: Pick<LibraryPolicySubmission, 'title' | 'school_name' | 'topic' | 'category' | 'summary' | 'url' | 'submitted_by'>) => must(db.from('library_policies').insert(row));
export const reviewPolicy = (id: UUID, status: 'approved' | 'rejected') => must(db.from('library_policies').update({ status }).eq('id', id));

// ---------------- Records, library, adaptations ----------------
export const listRecords = () => must<ImplementationRecord[]>(db.from('records').select('*').order('updated_at', { ascending: false }));
export const getRecord = (id: UUID) => must<ImplementationRecord>(db.from('records').select('*').eq('id', id).single());
/** Public pages read a view that drops the school and city from anonymised records. */
export const listPublicRecords = () => must<ImplementationRecord[]>(db.from('public_records').select('*').order('published_at', { ascending: false }));
export const getPublicRecord = async (id: UUID) => {
  const r = await must<ImplementationRecord | null>(db.from('public_records').select('*').eq('id', id).maybeSingle());
  if (!r) throw new Error('not public');
  return r;
};
export async function saveRecord(row: Partial<ImplementationRecord> & { org_id: UUID }) {
  if (row.id) {
    await must(db.from('records').update({ ...row, updated_at: nowIso() }).eq('id', row.id));
    return getRecord(row.id);
  }
  return must<ImplementationRecord>(db.from('records').insert({ version: 1, status: 'draft', visibility: 'school', ...row, updated_at: nowIso() }).select().single());
}
export async function publishRecord(rec: ImplementationRecord, visibility: 'network' | 'public', actor: UUID) {
  await must(db.from('records').update({ status: 'published', visibility, published_at: nowIso(), version: rec.status === 'published' ? rec.version + 1 : rec.version, updated_at: nowIso() }).eq('id', rec.id));
  await audit(actor, `published record (${visibility})`, 'records', rec.id);
}
export const listAdaptations = () => must<Adaptation[]>(db.from('adaptations').select('*'));
export async function adaptRecord(rec: ImplementationRecord, orgId: UUID, differences: Record<string, string>, notes: string, actor: UUID) {
  const project = await createProject(orgId, { title: `${rec.title} (adapted)`, category: rec.category, template_key: null, adapted_from_record_id: rec.id, problem: '' }, actor);
  await updateProject(project.id, { solution: `Adapted from “${rec.title}”. ${rec.intervention}` });
  for (const o of rec.outcomes) await setProjectMetric(project.id, o.metric_code, {});
  await must(db.from('adaptations').insert({ source_record_id: rec.id, project_id: project.id, org_id: orgId, differences, notes, result: null }));
  await audit(actor, 'adapted record', 'records', rec.id);
  return project;
}

// ---------------- Verifications ----------------
export const listVerifications = () => must<Verification[]>(db.from('verifications').select('*').order('created_at', { ascending: false }));
/** The database enforces these rules too; checking first gives clearer messages. */
export async function requestVerification(row: Omit<Verification, 'id' | 'created_at' | 'status'>) {
  if (!row.verifier_org) throw new Error('Choose who verifies.');
  if (row.verifier_org === row.requested_by_org) throw new Error('A school cannot audit its own records.');
  const verifier = await getOrg(row.verifier_org);
  if (row.requested_tier === 3 && !verifier.audit_school) throw new Error('T3 peer audits are carried out by Ekoa audit schools only.');
  if (row.requested_tier === 4 && verifier.org_type !== 'partner') throw new Error('T4 verification comes from a partner organisation.');
  const open = (await listVerifications()).some((v) => v.record_id === row.record_id && v.requested_tier === row.requested_tier && (v.status === 'requested' || v.status === 'in_progress'));
  if (open) throw new Error(`A T${row.requested_tier} request for this record is already open.`);
  return must(db.from('verifications').insert({ ...row, status: 'requested' }));
}
export async function completeVerification(v: Verification, verified: boolean, notes: string) {
  if (notes.trim().length < 3) throw new Error(verified ? 'Note what you checked.' : 'Give the school a reason.');
  // Runs in the database: auditors verify another school's record without write access to it.
  const { error } = await supabase.rpc('complete_verification', { p_id: v.id, p_verified: verified, p_notes: notes });
  if (error) throw new Error(error.message);
}

// ---------------- Policies ----------------
export const listPolicies = () => must<Policy[]>(db.from('policies').select('*').order('updated_at', { ascending: false }));
export const getPolicy = (id: UUID) => must<Policy>(db.from('policies').select('*').eq('id', id).single());
export async function savePolicy(row: Partial<Policy> & { org_id: UUID }) {
  if (row.id) {
    await must(db.from('policies').update({ ...row, updated_at: nowIso() }).eq('id', row.id));
    return getPolicy(row.id);
  }
  return must<Policy>(db.from('policies').insert({ version: 1, status: 'draft', adopted_at: null, ...row, updated_at: nowIso() }).select().single());
}
export const listClauses = () => must<PolicyClause[]>(db.from('policy_clauses').select('*').order('adoption_count', { ascending: false }));
export const listAmendments = () => must<PolicyAmendment[]>(db.from('policy_amendments').select('*').order('adopted_on', { ascending: false }));
export const addAmendment = (row: Omit<PolicyAmendment, 'id'>) => must(db.from('policy_amendments').insert(row));
export async function bumpClauseAdoptions(ids: UUID[]) {
  const { error } = await supabase.rpc('bump_clause_adoptions', { p_ids: ids });
  if (error) throw new Error(error.message);
}

// ---------------- Evidence ----------------
export const listEvidence = () => must<Evidence[]>(db.from('evidence').select('*').order('created_at', { ascending: false }));

/** Re-encode images through a canvas: this strips EXIF data, including GPS location. */
export async function stripExif(file: File, maxSide = 1600): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.82));
}

export async function uploadEvidence(orgId: UUID, projectId: UUID | null, file: File, caption: string, containsPeople: boolean, consentChecked: boolean) {
  if (containsPeople && !consentChecked) throw new Error('Photos showing people need confirmed guardian consent. Choose a photo of the bins or the site instead.');
  const clean = await stripExif(file);
  // Files sit in a private bucket, in a folder named after the school.
  const storage_path = `${orgId}/${uuid()}.jpg`;
  const { error } = await supabase.storage.from('evidence').upload(storage_path, clean, { contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  return must<Evidence>(
    db.from('evidence').insert({
      org_id: orgId, project_id: projectId, file_name: file.name, file_type: 'image/jpeg', data_url: null, storage_path,
      contains_people: containsPeople, consent_checked: consentChecked, exif_stripped: true, caption,
    }).select().single(),
  );
}
/** Signed links last an hour, so evidence never sits at a public address. */
export async function evidenceUrl(e: Evidence): Promise<string | null> {
  if (!e.storage_path) return e.data_url;
  const { data } = await supabase.storage.from('evidence').createSignedUrl(e.storage_path, 3600);
  return data?.signedUrl ?? null;
}

// ---------------- Handover ----------------
export const listHandovers = () => must<HandoverPacket[]>(db.from('handover_packets').select('*').order('created_at', { ascending: false }));
export async function saveHandover(row: Partial<HandoverPacket> & { org_id: UUID }) {
  if (row.id) return must(db.from('handover_packets').update(row).eq('id', row.id));
  return must(db.from('handover_packets').insert(row));
}

// ---------------- Circles, threads, posts ----------------
export const listCircles = () => must<Circle[]>(db.from('circles').select('*').order('name'));
export const listCircleMembers = () => must<CircleMember[]>(db.from('circle_members').select('*'));
export const joinCircle = (circleId: UUID, personId: UUID) => must(db.from('circle_members').insert({ circle_id: circleId, person_id: personId }));
export const listThreads = () => must<Thread[]>(db.from('threads').select('*').order('created_at', { ascending: false }));
export const getThread = (id: UUID) => must<Thread>(db.from('threads').select('*').eq('id', id).single());
export const listPosts = () => must<Post[]>(db.from('posts').select('*').order('created_at'));
export const updateThread = (id: UUID, patch: Partial<Thread>) => must(db.from('threads').update(patch).eq('id', id));

/** Contact details are never allowed in shared spaces: they are how off-platform contact starts. */
const CONTACT_PATTERNS: [RegExp, string][] = [
  [/(\+?\d[\d\s-]{7,}\d)/, 'phone number'],
  [/\d{2,}x{2,}\d{2,}/i, 'phone number'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'email address'],
  [/\b(whatsapp|insta(gram)?|snap(chat)?|telegram|discord|dm me|message me privately)\b/i, 'off-platform contact'],
  [/@[a-z0-9_.]{3,}/i, 'social handle'],
];
export function screenText(text: string): string | null {
  for (const [re, label] of CONTACT_PATTERNS) if (re.test(text)) return label;
  return null;
}

export async function addPost(thread: Thread, author: Person, body: string, meta: { role?: string; org?: string } = {}) {
  const hit = screenText(body);
  // A database trigger fills the author fields and screens the text again. A held post cannot be
  // read back by its author, so it is inserted without asking for the row.
  const id = uuid();
  await must(
    db.from('posts').insert({
      id, thread_id: thread.id, person_id: author.id, body, flagged: !!hit, hidden: !!hit,
      author_name: author.display_name, author_role: meta.role ?? '', author_org: meta.org ?? '', author_is_minor: author.is_minor,
    }),
  );
  const back = await must<{ hidden: boolean } | null>(db.from('posts').select('hidden').eq('id', id).maybeSingle());
  const held = !back || back.hidden ? hit ?? 'contact detail' : null;
  return { held };
}
export async function createThread(row: Pick<Thread, 'kind' | 'title' | 'circle_id' | 'org_id' | 'record_id'> & { org_b?: UUID | null }, author: Person, body: string, meta: { role?: string; org?: string } = {}) {
  const t = await must<Thread>(db.from('threads').insert({ org_b: null, ...row, created_by: author.id, created_at: nowIso(), status: 'open' }).select().single());
  const res = await addPost(t, author, body, meta);
  return { thread: t, held: res.held };
}
export const moderatePost = (id: UUID, patch: Partial<Post>) => must(db.from('posts').update(patch).eq('id', id));

// ---------------- Twins, campaigns, events ----------------
export const listTwins = () => must<Twin[]>(db.from('twins').select('*'));
export const addTwin = (row: Omit<Twin, 'id'>) => must(db.from('twins').insert(row));
export const listCampaigns = () => must<Campaign[]>(db.from('campaigns').select('*').order('starts_on', { ascending: false }));
export const saveCampaign = (row: Omit<Campaign, 'id'>) => must(db.from('campaigns').insert(row));
export const listCampaignParticipants = () => must<CampaignParticipant[]>(db.from('campaign_participants').select('*'));
export const joinCampaign = (campaignId: UUID, orgId: UUID) => must(db.from('campaign_participants').insert({ campaign_id: campaignId, org_id: orgId, baseline: null, latest: null }));
export const listEvents = () => must<EventItem[]>(db.from('events').select('*').order('starts_at'));
export const saveEvent = (row: Omit<EventItem, 'id'>) => must(db.from('events').insert(row));

// ---------------- Applications (public intake) ----------------
export async function submitApplication(row: Pick<Application, 'name' | 'email' | 'organisation' | 'country' | 'role' | 'message' | 'has_lead' | 'lead_plan'>) {
  // Insert only: the public can create an application but never read the table.
  await must(db.from('applications').insert({ ...row, status: 'new', notes: '' }));
  // Emails the stewards once the notify-application function is deployed.
  await supabase.functions.invoke('notify-application', { body: row }).catch(() => undefined);
}
export const listApplications = () => must<Application[]>(db.from('applications').select('*').order('created_at', { ascending: false }));
export const updateApplication = (id: UUID, patch: Partial<Application>) => must(db.from('applications').update(patch).eq('id', id));

// ---------------- School ranking ----------------
export interface RankRow {
  org_id: UUID; name: string; country: string; city: string;
  verified_records: number; audited_records: number; adopting_schools: number; adoptions_that_worked: number;
  score: number; position: number;
}
/** Read from the public_school_ranking view, which holds the formula. */
export const listSchoolRanking = () => must<RankRow[]>(db.from('public_school_ranking').select('*').order('position'));

// ---------------- Safeguarding ----------------
export async function submitConcern(row: Pick<SafeguardingReport, 'reporter_person_id' | 'reporter_contact' | 'subject_ref' | 'category' | 'details'>) {
  await must(db.from('safeguarding_reports').insert({ ...row, status: 'new', assigned_to: 'Ekoa safeguarding lead', actions: [{ at: nowIso(), note: 'Report received.' }] }));
}
export const listReports = () => must<SafeguardingReport[]>(db.from('safeguarding_reports').select('*').order('created_at', { ascending: false }));
export const updateReport = (id: UUID, patch: Partial<SafeguardingReport>) => must(db.from('safeguarding_reports').update(patch).eq('id', id));

// ---------------- Published reports ----------------
export interface PublishedReport { id: UUID; slug: string; title: string; data: unknown; published_at: string }
export const getPublishedReport = (slug: string) => must<PublishedReport | null>(db.from('reports').select('*').eq('slug', slug).maybeSingle());
export async function publishReport(slug: string, title: string, data: unknown, actor: UUID) {
  const existing = await getPublishedReport(slug);
  if (existing) await must(db.from('reports').update({ data, title, published_at: nowIso() }).eq('id', existing.id));
  else await must(db.from('reports').insert({ slug, title, data, published_at: nowIso() }));
  await audit(actor, `published report ${slug}`, 'reports', slug);
}
