-- Ekoa: core schema.
-- Run the migrations in order (CLI: `supabase db push`, or paste each file into the SQL editor).
-- Every table that holds school data carries the school's id so row-level security can separate schools.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ---------------------------------------------------------------- Organisations and people
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type text not null check (org_type in ('school', 'partner', 'ekoa')),
  country text not null default '',
  city text not null default '',
  lat double precision,
  lng double precision,
  curriculum text,
  student_count integer check (student_count is null or student_count > 0),
  grade_range text,
  climate_zone text,
  context_profile jsonb,
  status text not null default 'onboarding' check (status in ('applied', 'onboarding', 'active', 'paused')),
  public_visible boolean not null default false,
  anonymised_label text,
  audit_school boolean not null default false,
  created_at timestamptz not null default now()
);
comment on column public.organisations.audit_school is 'Ekoa audit schools (Shiv Nadar School, Faridabad and Green School, Bali) carry out T3 peer audits of other schools.';

create table public.people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  display_name text not null,
  email text not null unique,
  age_band text not null check (age_band in ('13-15', '16-17', '18+')),
  is_minor boolean not null,
  locale text not null default 'en',
  consent_status text not null default 'not_needed' check (consent_status in ('not_needed', 'pending', 'granted', 'withdrawn')),
  created_at timestamptz not null default now(),
  check (is_minor = (age_band <> '18+'))
);
comment on table public.people is 'Age band only, never a date of birth. Minors stay inactive until a guardian consents.';

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  guardian_name text not null default '',
  guardian_email text not null default '',
  scope jsonb not null default '{"account": false, "cross_school": false, "photos": false, "name_on_records": false}',
  method text not null default 'email_link' check (method in ('email_link', 'paper_upload')),
  terms_version text not null,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  granted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  role text not null check (role in ('project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison', 'approver', 'auditor', 'steward', 'partner', 'alumni')),
  seat integer,
  local_title text check (local_title is null or length(local_title) <= 80),
  term_start date not null default current_date,
  term_end date,
  status text not null default 'active' check (status in ('incoming', 'active', 'outgoing', 'alumni')),
  created_at timestamptz not null default now()
);
create index on public.role_assignments (person_id);
create index on public.role_assignments (org_id);

create table public.cohorts (id uuid primary key default gen_random_uuid(), name text not null, starts_on date not null, ends_on date, created_at timestamptz not null default now());
create table public.cohort_members (id uuid primary key default gen_random_uuid(), cohort_id uuid not null references public.cohorts (id) on delete cascade, org_id uuid not null references public.organisations (id) on delete cascade, created_at timestamptz not null default now(), unique (cohort_id, org_id));

-- ---------------------------------------------------------------- Method: metrics
create table public.metric_definitions (
  code text primary key,
  name text not null,
  unit text not null,
  category text not null,
  protocol text not null,
  frequency text not null,
  comparability_notes text not null default '',
  higher_is_better boolean not null,
  is_impact boolean not null default true,
  inputs jsonb not null default '[]',
  version integer not null default 1,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Governance
create table public.governance_steps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  position integer not null,
  body text not null,
  decision_rights text not null default '',
  budget_limit numeric,
  typical_days integer not null default 7 check (typical_days >= 0),
  created_at timestamptz not null default now()
);
create index on public.governance_steps (org_id, position);

-- ---------------------------------------------------------------- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  title text not null,
  category text not null,
  stage text not null default 'identify' check (stage in ('identify', 'design', 'implement', 'collaborate', 'measure', 'scale')),
  status text not null default 'active' check (status in ('active', 'stalled', 'paused', 'completed', 'ended')),
  owner_role text not null default 'project_lead',
  template_key text,
  starts_on date not null default current_date,
  ends_on date,
  adapted_from_record_id uuid,
  problem text not null default '',
  solution text not null default '',
  monitoring_plan jsonb not null default '[]',
  risks jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.projects (org_id);

create table public.stage_gates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage text not null,
  checklist jsonb not null default '{}',
  signed_by uuid references public.people (id),
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  owner_role text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  due_on date,
  created_at timestamptz not null default now()
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  ask text not null default '',
  submitted_at timestamptz not null default now(),
  current_step_id uuid references public.governance_steps (id) on delete set null,
  decision text not null default 'pending' check (decision in ('pending', 'approved', 'rejected', 'withdrawn')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.approval_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  step_id uuid not null references public.governance_steps (id) on delete restrict,
  entered_at timestamptz not null default now(),
  decided_at timestamptz,
  decision text not null default 'pending' check (decision in ('pending', 'passed', 'returned', 'rejected')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.budget_pathways (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_type text not null check (source_type in ('school_budget', 'parent_association', 'grant', 'sponsor', 'zero_cost')),
  amount numeric not null default 0 check (amount >= 0),
  currency text not null default 'INR',
  approver text not null default '',
  status text not null default 'planned' check (status in ('planned', 'requested', 'approved', 'released', 'refused')),
  rigidity_notes text not null default '',
  created_at timestamptz not null default now()
);

-- Every project states what it plans to spend, line by line, and later what it actually spent.
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  category text not null check (category in ('materials', 'equipment', 'services', 'printing', 'transport', 'food', 'other')),
  item text not null check (length(item) between 1 and 200),
  planned numeric not null default 0 check (planned >= 0),
  actual numeric check (actual is null or actual >= 0),
  currency text not null default 'INR',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index on public.budget_lines (project_id);

create table public.project_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  metric_code text not null references public.metric_definitions (code),
  baseline numeric,
  target numeric,
  created_at timestamptz not null default now(),
  unique (project_id, metric_code)
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  file_name text not null,
  file_type text not null,
  data_url text,
  storage_path text,
  contains_people boolean not null default false,
  consent_checked boolean not null default false,
  exif_stripped boolean not null default true,
  caption text not null default '',
  created_at timestamptz not null default now(),
  check (not contains_people or consent_checked)
);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  metric_code text not null references public.metric_definitions (code),
  value numeric not null,
  raw jsonb not null default '{}',
  period_start date not null,
  period_end date not null,
  is_baseline boolean not null default false,
  method text not null default '',
  entered_by uuid references public.people (id) on delete set null,
  entered_role text not null,
  tier smallint not null default 0 check (tier between 0 and 4),
  evidence_id uuid references public.evidence (id) on delete set null,
  replaces_id uuid references public.measurements (id),
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);
create index on public.measurements (project_id, metric_code, period_end);

create table public.obstacles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage text not null,
  category text not null,
  subcategory text not null default '',
  severity text not null check (severity in ('blocked', 'delayed', 'minor')),
  started_on date not null default current_date,
  resolved_on date,
  resolution text not null default '',
  description text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Records and library
create table public.records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  org_id uuid not null references public.organisations (id) on delete cascade,
  version integer not null default 1,
  title text not null,
  summary text not null default '',
  category text not null default '',
  context jsonb not null default '{}',
  problem text not null default '',
  intervention text not null default '',
  timeline text not null default '',
  budget_summary text not null default '',
  budget_amount_usd numeric not null default 0,
  budget_planned numeric not null default 0 check (budget_planned >= 0),
  budget_actual numeric not null default 0 check (budget_actual >= 0),
  budget_currency text not null default 'USD',
  budget_lines jsonb not null default '[]',
  approval_summary jsonb not null default '[]',
  obstacles jsonb not null default '[]',
  outcomes jsonb not null default '[]',
  outcome_class text not null default 'too_early' check (outcome_class in ('worked', 'partly', 'did_not_work', 'too_early')),
  tier smallint not null default 0 check (tier between 0 and 4),
  lessons text not null default '',
  materials jsonb not null default '[]',
  contributors jsonb not null default '[]',
  visibility text not null default 'school' check (visibility in ('school', 'network', 'public')),
  anonymised boolean not null default false,
  ai_drafted boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published')),
  published_at timestamptz,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.records (org_id);
create index records_fts on public.records using gin (to_tsvector('english', title || ' ' || summary || ' ' || intervention || ' ' || lessons));

alter table public.projects add constraint projects_adapted_from_fk foreign key (adapted_from_record_id) references public.records (id) on delete set null;

create table public.adaptations (
  id uuid primary key default gen_random_uuid(),
  source_record_id uuid not null references public.records (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,
  differences jsonb not null default '{}',
  notes text not null default '',
  result text check (result in ('worked', 'partly', 'did_not_work', 'too_early')),
  created_at timestamptz not null default now()
);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records (id) on delete cascade,
  requested_tier smallint not null check (requested_tier in (3, 4)),
  requested_by_org uuid not null references public.organisations (id) on delete cascade,
  verifier_org uuid references public.organisations (id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'in_progress', 'verified', 'declined')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Policy
create table public.policy_clauses (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  body text not null,
  source_org_id uuid references public.organisations (id) on delete set null,
  adoption_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  title text not null,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'internal_review', 'approved', 'adopted', 'amended')),
  sections jsonb not null default '[]',
  adopted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.policy_amendments (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies (id) on delete cascade,
  summary text not null,
  adopted_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Continuity
create table public.handover_packets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  role text not null,
  from_person_id uuid not null references public.people (id) on delete cascade,
  to_person_id uuid references public.people (id) on delete set null,
  snapshot jsonb not null default '{}',
  checklist jsonb not null default '{}',
  note text not null default '',
  signed_out_at timestamptz,
  signed_in_at timestamptz,
  signed_liaison_at timestamptz,
  term_switch_on date not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Network
create table public.circles (id uuid primary key default gen_random_uuid(), name text not null, theme text not null unique, description text not null default '', created_at timestamptz not null default now());
create table public.circle_members (id uuid primary key default gen_random_uuid(), circle_id uuid not null references public.circles (id) on delete cascade, person_id uuid not null references public.people (id) on delete cascade, created_at timestamptz not null default now(), unique (circle_id, person_id));

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('circle', 'partner_request', 'twin')),
  circle_id uuid references public.circles (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,
  org_b uuid references public.organisations (id) on delete cascade,
  record_id uuid references public.records (id) on delete set null,
  title text not null,
  created_by uuid references public.people (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  author_name text not null default '',
  author_role text not null default '',
  author_org text not null default '',
  author_is_minor boolean not null default false,
  body text not null,
  flagged boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.posts (thread_id, created_at);

create table public.twins (id uuid primary key default gen_random_uuid(), org_a uuid not null references public.organisations (id) on delete cascade, org_b uuid not null references public.organisations (id) on delete cascade, note text not null default '', created_at timestamptz not null default now(), check (org_a <> org_b));

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  starts_on date not null,
  ends_on date not null,
  metric_code text not null references public.metric_definitions (code),
  protocol text not null default '',
  sponsor text,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create table public.campaign_participants (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns (id) on delete cascade, org_id uuid not null references public.organisations (id) on delete cascade, baseline numeric, latest numeric, created_at timestamptz not null default now(), unique (campaign_id, org_id));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('circle_call', 'cohort_call', 'workshop', 'climate_cafe')),
  starts_at timestamptz not null,
  circle_id uuid references public.circles (id) on delete set null,
  description text not null default '',
  adults_present jsonb not null default '[]',
  recorded boolean not null default false,
  created_at timestamptz not null default now(),
  check (jsonb_array_length(adults_present) >= 2 or kind = 'climate_cafe')
);

-- ---------------------------------------------------------------- Intake, safeguarding, audit, reports
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organisation text not null default '',
  country text not null default '',
  role text not null default '',
  message text not null default '' check (length(message) <= 5000),
  has_lead text not null default '' check (has_lead in ('', 'yes', 'eco_club', 'no')),
  lead_plan text not null default '' check (length(lead_plan) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'call_booked', 'agreement_sent', 'onboarded', 'declined')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.safeguarding_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_person_id uuid references public.people (id) on delete set null,
  reporter_contact text not null default '',
  subject_ref text not null default '',
  category text not null check (category in ('contact', 'content', 'privacy', 'wellbeing', 'other')),
  details text not null,
  status text not null default 'new' check (status in ('new', 'triaged', 'escalated', 'resolved')),
  assigned_to text not null default 'Ekoa safeguarding lead',
  actions jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_person_id uuid references public.people (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text not null default '',
  meta jsonb not null default '{}',
  at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  data jsonb not null,
  published_at timestamptz not null default now()
);
