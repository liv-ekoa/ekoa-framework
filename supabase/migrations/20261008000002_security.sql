-- Ekoa: row-level security, guard triggers and the narrow functions used by guardians,
-- partners and stewards. Principle: a school sees its own data; the network sees published
-- records; anonymous visitors see only what the public site shows.

-- ---------------------------------------------------------------- Helper functions
-- SECURITY DEFINER so policies can look up roles without recursive RLS checks.

create or replace function public.current_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from people where auth_user_id = auth.uid()
$$;

-- A minor whose guardian has not consented has a person row but no access to anything else.
create or replace function public.active_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from people where auth_user_id = auth.uid() and consent_status in ('granted', 'not_needed')
$$;

create or replace function public.is_steward() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from role_assignments where person_id = active_person_id() and role = 'steward' and status in ('active', 'outgoing'))
$$;

create or replace function public.is_partner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from role_assignments where person_id = active_person_id() and role = 'partner' and status in ('active', 'outgoing'))
$$;

create or replace function public.is_liaison_anywhere() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from role_assignments where person_id = active_person_id() and role = 'faculty_liaison' and status in ('active', 'outgoing'))
$$;

-- Incoming leads count as members so they can shadow before their term starts.
create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from role_assignments where person_id = active_person_id() and org_id = p_org and status in ('active', 'outgoing', 'incoming'))
$$;

create or replace function public.has_role(p_org uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from role_assignments where person_id = active_person_id() and org_id = p_org and role = any (p_roles) and status in ('active', 'outgoing'))
$$;

create or replace function public.can_write(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(p_org, array['project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison'])
$$;

create or replace function public.in_network() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from role_assignments where person_id = active_person_id() and status in ('active', 'outgoing', 'incoming'))
$$;

-- Adults always; minors only if their guardian allowed cross-school circles.
create or replace function public.can_cross_school() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from people p
    where p.id = active_person_id()
      and (not p.is_minor or exists (
        select 1 from consent_records c
        where c.person_id = p.id and c.granted_at is not null and c.withdrawn_at is null and coalesce((c.scope ->> 'cross_school')::boolean, false)
      ))
  )
$$;

create or replace function public.is_admin_context() returns boolean
language sql stable as $$
  -- True for the SQL editor, migrations and the service-role key; false for signed-in users and visitors.
  select coalesce(nullif(current_setting('role', true), 'none'), current_user) not in ('anon', 'authenticated')
$$;

create or replace function public.project_org(p_project uuid) returns uuid
language sql stable security definer set search_path = public as $$ select org_id from projects where id = p_project $$;

create or replace function public.proposal_org(p_proposal uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select pr.org_id from proposals p join projects pr on pr.id = p.project_id where p.id = p_proposal
$$;

create or replace function public.policy_org(p_policy uuid) returns uuid
language sql stable security definer set search_path = public as $$ select org_id from policies where id = p_policy $$;

-- Peer audit. An auditor (or the liaison) at an Ekoa audit school can read what an open audit
-- request covers: the record, its project's measurements and targets, and evidence without people.
create or replace function public.is_audit_school(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select audit_school from organisations where id = p_org), false)
$$;

create or replace function public.audits_record(p_record uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_cross_school() and exists (
    select 1 from verifications v
    where v.record_id = p_record and v.status in ('requested', 'in_progress')
      and public.has_role(v.verifier_org, array['auditor', 'faculty_liaison', 'partner'])
  )
$$;

create or replace function public.audits_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from records r where r.project_id = p_project and public.audits_record(r.id))
$$;

-- ---------------------------------------------------------------- Enable RLS everywhere
do $$
declare t text;
begin
  foreach t in array array[
    'organisations', 'people', 'consent_records', 'role_assignments', 'cohorts', 'cohort_members', 'metric_definitions',
    'governance_steps', 'projects', 'stage_gates', 'tasks', 'proposals', 'approval_events', 'budget_pathways', 'budget_lines', 'project_metrics',
    'evidence', 'measurements', 'obstacles', 'records', 'adaptations', 'verifications', 'policy_clauses', 'policies',
    'policy_amendments', 'handover_packets', 'circles', 'circle_members', 'threads', 'posts', 'twins', 'campaigns',
    'campaign_participants', 'events', 'applications', 'safeguarding_reports', 'audit_log', 'reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- Organisations and people
create policy org_read on public.organisations for select to anon, authenticated using (public_visible or public.in_network());
create policy org_insert on public.organisations for insert to authenticated with check (public.is_steward());
create policy org_update on public.organisations for update to authenticated using (public.is_steward() or public.has_role(id, array['faculty_liaison']));

create policy people_read on public.people for select to authenticated using (
  id = public.current_person_id() or public.is_steward()
  or exists (select 1 from role_assignments r where r.person_id = people.id and public.is_member(r.org_id))
);
create policy people_insert on public.people for insert to authenticated with check (public.is_steward() or public.is_liaison_anywhere());
create policy people_update on public.people for update to authenticated using (
  public.is_steward() or exists (select 1 from role_assignments r where r.person_id = people.id and public.has_role(r.org_id, array['faculty_liaison']))
);

create policy consent_read on public.consent_records for select to authenticated using (
  person_id = public.current_person_id() or public.is_steward()
  or exists (select 1 from role_assignments r where r.person_id = consent_records.person_id and public.has_role(r.org_id, array['faculty_liaison']))
);
create policy consent_insert on public.consent_records for insert to authenticated with check (
  public.is_steward() or exists (select 1 from role_assignments r where r.person_id = consent_records.person_id and public.has_role(r.org_id, array['faculty_liaison']))
);
-- Consent is granted or withdrawn only through the functions below.

create policy roles_read on public.role_assignments for select to authenticated using (person_id = public.current_person_id() or public.is_member(org_id) or public.is_steward());
create policy roles_insert on public.role_assignments for insert to authenticated with check (public.is_steward() or public.has_role(org_id, array['faculty_liaison']));
create policy roles_update on public.role_assignments for update to authenticated using (public.is_steward() or public.has_role(org_id, array['faculty_liaison']));

create policy cohorts_read on public.cohorts for select to anon, authenticated using (true);
create policy cohorts_write on public.cohorts for all to authenticated using (public.is_steward()) with check (public.is_steward());
create policy cohort_members_read on public.cohort_members for select to anon, authenticated using (true);
create policy cohort_members_write on public.cohort_members for all to authenticated using (public.is_steward()) with check (public.is_steward());

create policy metrics_read on public.metric_definitions for select to anon, authenticated using (true);
create policy metrics_write on public.metric_definitions for all to authenticated using (public.is_steward()) with check (public.is_steward());

-- ---------------------------------------------------------------- Governance and projects
create policy steps_read on public.governance_steps for select to authenticated using (public.is_member(org_id) or public.is_steward());
create policy steps_write on public.governance_steps for all to authenticated
  using (public.has_role(org_id, array['faculty_liaison']) or public.is_steward())
  with check (public.has_role(org_id, array['faculty_liaison']) or public.is_steward());

create policy projects_read on public.projects for select to authenticated using (public.is_member(org_id) or public.is_steward() or public.audits_project(id));
create policy projects_insert on public.projects for insert to authenticated with check (public.can_write(org_id));
create policy projects_update on public.projects for update to authenticated using (public.can_write(org_id));

-- Tables that hang off a project share one rule: read if member, write if a working member.
do $$
declare t text;
begin
  foreach t in array array['stage_gates', 'tasks', 'budget_pathways', 'budget_lines', 'project_metrics', 'measurements', 'obstacles'] loop
    execute format('create policy %1$s_read on public.%1$I for select to authenticated using (public.is_member(public.project_org(project_id)) or public.is_steward())', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (public.can_write(public.project_org(project_id)))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (public.can_write(public.project_org(project_id)))', t);
  end loop;
end $$;
create policy tasks_delete on public.tasks for delete to authenticated using (public.can_write(public.project_org(project_id)));
create policy project_metrics_delete on public.project_metrics for delete to authenticated using (public.can_write(public.project_org(project_id)));
create policy budget_lines_delete on public.budget_lines for delete to authenticated using (public.can_write(public.project_org(project_id)));
-- Auditors see the numbers they are checking, read-only.
create policy measurements_audit_read on public.measurements for select to authenticated using (public.audits_project(project_id));
create policy project_metrics_audit_read on public.project_metrics for select to authenticated using (public.audits_project(project_id));
create policy budget_lines_audit_read on public.budget_lines for select to authenticated using (public.audits_project(project_id));

create policy proposals_read on public.proposals for select to authenticated using (public.is_member(public.project_org(project_id)) or public.is_steward());
create policy proposals_insert on public.proposals for insert to authenticated with check (public.can_write(public.project_org(project_id)));
create policy proposals_update on public.proposals for update to authenticated using (public.can_write(public.project_org(project_id)) or public.has_role(public.project_org(project_id), array['approver']));

create policy approvals_read on public.approval_events for select to authenticated using (public.is_member(public.proposal_org(proposal_id)) or public.is_steward());
create policy approvals_insert on public.approval_events for insert to authenticated with check (public.can_write(public.proposal_org(proposal_id)) or public.has_role(public.proposal_org(proposal_id), array['approver']));
create policy approvals_update on public.approval_events for update to authenticated using (public.has_role(public.proposal_org(proposal_id), array['faculty_liaison', 'approver']));

create policy evidence_read on public.evidence for select to authenticated using (
  public.is_member(org_id) or public.is_steward()
  or (project_id is not null and not contains_people and public.audits_project(project_id))
);
create policy evidence_insert on public.evidence for insert to authenticated with check (public.can_write(org_id));

-- ---------------------------------------------------------------- Records
create policy records_read on public.records for select to authenticated using (
  public.is_member(org_id) or public.is_steward()
  or (status = 'published' and visibility in ('network', 'public') and public.in_network())
  or public.audits_record(id)
);
create policy records_insert on public.records for insert to authenticated with check (public.can_write(org_id));
create policy records_update on public.records for update to authenticated using (public.can_write(org_id));

-- Anonymous visitors read published public records through this view, which drops the school,
-- the project and the city from anonymised records. Runs with the view owner's rights.
create or replace view public.public_records as
select
  id,
  case when anonymised then null else project_id end as project_id,
  case when anonymised then null else org_id end as org_id,
  version, title, summary, category,
  case when anonymised then (context - 'city') || jsonb_build_object('city', '') else context end as context,
  problem, intervention, timeline, budget_summary, budget_amount_usd, budget_planned, budget_actual, budget_currency, budget_lines,
  approval_summary, obstacles, outcomes,
  outcome_class, tier, lessons, materials, contributors, visibility, anonymised, ai_drafted, status, published_at, created_at, updated_at
from public.records
where status = 'published' and visibility = 'public';
grant select on public.public_records to anon, authenticated;

create policy adaptations_read on public.adaptations for select to authenticated using (public.in_network());
create policy adaptations_insert on public.adaptations for insert to authenticated with check (public.can_write(public.project_org(project_id)));

-- The adapting school is always the project's school, never what the client claims.
create or replace function public.stamp_adaptation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.org_id := public.project_org(new.project_id);
  return new;
end $$;
create trigger adaptation_stamp before insert or update on public.adaptations for each row execute function public.stamp_adaptation();

create policy verifications_read on public.verifications for select to authenticated using (public.is_member(requested_by_org) or public.is_member(verifier_org) or public.is_steward());
create policy verifications_insert on public.verifications for insert to authenticated with check (public.can_write(requested_by_org));

-- Schools rank on verified impact only: published, public, named records at T2 or higher, plus
-- how many other schools adapted their models. Anonymised records and hidden schools are left out.
create or replace view public.public_school_ranking as
with recs as (
  select r.org_id, r.id, r.tier,
         case r.outcome_class when 'worked' then 10 when 'partly' then 6 when 'did_not_work' then 4 else 0 end
         * case when r.tier >= 3 then 1.5 else 1 end as points
  from records r join organisations o on o.id = r.org_id
  where r.status = 'published' and r.visibility = 'public' and not r.anonymised and o.public_visible and r.tier >= 2
), adopt as (
  select r.org_id, count(distinct a.org_id) as adopters, count(*) filter (where a.result = 'worked') as adopted_worked
  from adaptations a join records r on r.id = a.source_record_id
  where r.status = 'published' and r.visibility = 'public' and not r.anonymised and a.org_id <> r.org_id
  group by r.org_id
), per_school as (
  select o.id as org_id, o.name, o.country, o.city,
         count(recs.id)::int as verified_records,
         (count(recs.id) filter (where recs.tier >= 3))::int as audited_records,
         coalesce(max(adopt.adopters), 0)::int as adopting_schools,
         coalesce(max(adopt.adopted_worked), 0)::int as adoptions_that_worked,
         (coalesce(sum(recs.points), 0) + 8 * coalesce(max(adopt.adopters), 0) + 4 * coalesce(max(adopt.adopted_worked), 0))::numeric as score
  from organisations o
  left join recs on recs.org_id = o.id
  left join adopt on adopt.org_id = o.id
  where o.org_type = 'school' and o.public_visible
  group by o.id
)
select *, rank() over (order by score desc) as position from per_school where score > 0;
grant select on public.public_school_ranking to anon, authenticated;

-- T3 peer audits go only to an Ekoa audit school other than the requesting school; T4 only to a partner.
create or replace function public.guard_verification_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec_org uuid := (select org_id from records where id = new.record_id);
begin
  if public.is_admin_context() then return new; end if;
  if rec_org is distinct from new.requested_by_org then raise exception 'A school can only request verification of its own records.'; end if;
  if new.verifier_org is null then raise exception 'Choose who verifies.'; end if;
  if new.verifier_org = new.requested_by_org then raise exception 'A school cannot audit its own records.'; end if;
  if new.requested_tier = 3 and not public.is_audit_school(new.verifier_org) then
    raise exception 'T3 peer audits are carried out by Ekoa audit schools only.';
  end if;
  if new.requested_tier = 4 and (select org_type from organisations where id = new.verifier_org) <> 'partner' then
    raise exception 'T4 verification comes from a partner organisation.';
  end if;
  new.status := 'requested';
  return new;
end $$;
create trigger verification_request_guard before insert on public.verifications for each row execute function public.guard_verification_request();

-- ---------------------------------------------------------------- Policy documents
create policy clauses_read on public.policy_clauses for select to authenticated using (public.in_network());
create policy clauses_write on public.policy_clauses for all to authenticated using (public.is_steward()) with check (public.is_steward());

create policy policies_read on public.policies for select to authenticated using (public.is_member(org_id) or public.is_steward());
create policy policies_insert on public.policies for insert to authenticated with check (public.has_role(org_id, array['project_lead', 'board_member', 'faculty_liaison']));
create policy policies_update on public.policies for update to authenticated using (public.has_role(org_id, array['project_lead', 'board_member', 'faculty_liaison', 'approver']));
create policy amendments_read on public.policy_amendments for select to authenticated using (public.is_member(public.policy_org(policy_id)) or public.is_steward());
create policy amendments_insert on public.policy_amendments for insert to authenticated with check (public.has_role(public.policy_org(policy_id), array['project_lead', 'board_member', 'faculty_liaison']));

-- ---------------------------------------------------------------- Continuity
create policy handover_read on public.handover_packets for select to authenticated using (public.is_member(org_id) or public.is_steward());
create policy handover_insert on public.handover_packets for insert to authenticated with check (public.can_write(org_id));
create policy handover_update on public.handover_packets for update to authenticated using (public.can_write(org_id));

-- ---------------------------------------------------------------- Network
create policy circles_read on public.circles for select to authenticated using (public.in_network());
create policy circles_write on public.circles for all to authenticated using (public.is_steward()) with check (public.is_steward());
create policy circle_members_read on public.circle_members for select to authenticated using (public.in_network());
create policy circle_members_join on public.circle_members for insert to authenticated with check ((person_id = public.active_person_id() and public.can_cross_school()) or public.is_steward());
create policy circle_members_leave on public.circle_members for delete to authenticated using (person_id = public.active_person_id() or public.is_steward());

create policy threads_read on public.threads for select to authenticated using (
  public.is_steward()
  or (kind = 'circle' and public.can_cross_school())
  or (kind = 'partner_request' and public.in_network())
  or public.is_member(org_id) or public.is_member(org_b)
);
create policy threads_insert on public.threads for insert to authenticated with check (
  created_by = public.active_person_id()
  and (kind <> 'circle' or public.can_cross_school())
  and (org_id is null or public.is_member(org_id) or public.is_steward())
);
create policy threads_update on public.threads for update to authenticated using (
  public.is_steward() or public.has_role(org_id, array['faculty_liaison']) or (kind = 'partner_request' and public.is_partner())
);

-- Posts are visible when their thread is (the subquery runs under the threads policy).
-- Posts held by the filter are visible only to adult moderators.
create policy posts_read on public.posts for select to authenticated using (
  exists (select 1 from threads t where t.id = posts.thread_id)
  and (not hidden or public.is_steward() or public.is_liaison_anywhere())
);
create policy posts_insert on public.posts for insert to authenticated with check (
  person_id = public.active_person_id() and exists (select 1 from threads t where t.id = posts.thread_id and t.status <> 'closed')
);
create policy posts_moderate on public.posts for update to authenticated using (public.is_steward() or public.is_liaison_anywhere());

create policy twins_read on public.twins for select to authenticated using (public.in_network());
create policy twins_write on public.twins for all to authenticated using (public.is_steward()) with check (public.is_steward());
create policy campaigns_read on public.campaigns for select to authenticated using (public.in_network());
create policy campaigns_write on public.campaigns for all to authenticated using (public.is_steward()) with check (public.is_steward());
create policy campaign_participants_read on public.campaign_participants for select to authenticated using (public.in_network());
create policy campaign_participants_join on public.campaign_participants for insert to authenticated with check (public.has_role(org_id, array['project_lead', 'ekoa_rep', 'faculty_liaison']) or public.is_steward());
create policy events_read on public.events for select to authenticated using (public.in_network());
create policy events_insert on public.events for insert to authenticated with check (public.is_steward() or public.is_liaison_anywhere());

-- ---------------------------------------------------------------- Intake, safeguarding, audit, reports
create policy applications_submit on public.applications for insert to anon, authenticated with check (status = 'new' and notes = '');
create policy applications_steward on public.applications for select to authenticated using (public.is_steward());
create policy applications_update on public.applications for update to authenticated using (public.is_steward());

create policy reports_submit on public.safeguarding_reports for insert to anon, authenticated with check (status = 'new');
create policy reports_read on public.safeguarding_reports for select to authenticated using (public.is_steward());
create policy reports_update on public.safeguarding_reports for update to authenticated using (public.is_steward());

create policy audit_insert on public.audit_log for insert to authenticated with check (actor_person_id is null or actor_person_id = public.current_person_id());
create policy audit_read on public.audit_log for select to authenticated using (public.is_steward());

create policy published_reports_read on public.reports for select to anon, authenticated using (true);
create policy published_reports_write on public.reports for all to authenticated using (public.is_steward()) with check (public.is_steward());

-- ---------------------------------------------------------------- Guard triggers

-- Gates are signed only by the role the Ekoa method names (or the faculty liaison).
create or replace function public.guard_stage_gate() returns trigger
language plpgsql security definer set search_path = public as $$
declare signer text := case new.stage
  when 'identify' then 'project_lead' when 'design' then 'faculty_liaison' when 'implement' then 'project_lead'
  when 'collaborate' then 'ekoa_rep' when 'measure' then 'faculty_liaison' else null end;
begin
  if public.is_admin_context() then return new; end if;
  if signer is null then raise exception 'The % stage has no manual gate', new.stage; end if;
  if not public.has_role(public.project_org(new.project_id), array[signer, 'faculty_liaison']) then
    raise exception 'Only the % or the faculty liaison can sign the % gate', replace(signer, '_', ' '), new.stage;
  end if;
  new.signed_by := public.active_person_id();
  new.signed_at := now();
  return new;
end $$;
create trigger stage_gate_guard before insert on public.stage_gates for each row execute function public.guard_stage_gate();

-- Measurements are immutable except for their tier; T2 and above need the faculty liaison.
create or replace function public.guard_measurement() returns trigger
language plpgsql security definer set search_path = public as $$
declare org uuid := public.project_org(new.project_id);
begin
  if public.is_admin_context() then return new; end if;
  if tg_op = 'UPDATE' and (new.value <> old.value or new.raw <> old.raw or new.period_end <> old.period_end or new.metric_code <> old.metric_code) then
    raise exception 'Measurements cannot be edited. Log a correction that replaces this one.';
  end if;
  if new.tier >= 2 and (tg_op = 'INSERT' or new.tier > old.tier)
     and not (public.has_role(org, array['faculty_liaison']) or public.is_steward() or coalesce(current_setting('ekoa.verifying', true), '') = 'on') then
    raise exception 'Only the faculty liaison can verify measurements (tier T2 or higher).';
  end if;
  if new.tier > 2 and current_setting('ekoa.verifying', true) is distinct from 'on' and not public.is_steward() then
    raise exception 'Tiers T3 and T4 come only from peer or partner verification.';
  end if;
  if tg_op = 'INSERT' then new.entered_by := public.active_person_id(); end if;
  return new;
end $$;
create trigger measurement_guard before insert or update on public.measurements for each row execute function public.guard_measurement();

-- Only the faculty liaison publishes; tiers above T2 come only from verification.
create or replace function public.guard_record() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then new.updated_at := now(); return new; end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published' or old.visibility <> new.visibility)
     and not (public.has_role(new.org_id, array['faculty_liaison']) or public.is_steward()) then
    raise exception 'Only the faculty liaison can publish a record.';
  end if;
  if new.visibility = 'public' and new.status = 'published' and new.tier < 2 then
    raise exception 'Public records need tier T2 or higher.';
  end if;
  if new.tier > 2 and (tg_op = 'INSERT' or new.tier > old.tier) and current_setting('ekoa.verifying', true) is distinct from 'on' and not public.is_steward() then
    raise exception 'Tiers T3 and T4 come only from peer or partner verification.';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger record_guard before insert or update on public.records for each row execute function public.guard_record();

-- People cannot grant themselves consent or change their own age band.
create or replace function public.guard_people() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then return new; end if;
  if new.consent_status = 'granted' and old.consent_status <> 'granted' and current_setting('ekoa.consent', true) is distinct from 'on' then
    raise exception 'Consent can only be granted by a guardian through their consent link.';
  end if;
  if new.age_band <> old.age_band and not (public.is_steward() or public.is_liaison_anywhere()) then
    raise exception 'Only the faculty liaison can change an age band.';
  end if;
  if new.auth_user_id is distinct from old.auth_user_id and current_setting('ekoa.linking', true) is distinct from 'on' and not public.is_steward() then
    raise exception 'Sign-in links are managed by the platform.';
  end if;
  return new;
end $$;
create trigger people_guard before update on public.people for each row execute function public.guard_people();

-- Policy status: only the liaison or an approver approves or adopts.
create or replace function public.guard_policy() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then new.updated_at := now(); return new; end if;
  if new.status in ('approved', 'adopted') and new.status is distinct from old.status
     and not (public.has_role(new.org_id, array['faculty_liaison', 'approver']) or public.is_steward()) then
    raise exception 'Only the faculty liaison or an approver can approve or adopt a policy.';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger policy_guard before update on public.policies for each row execute function public.guard_policy();

-- Posts: author fields come from the database, never the client, and contact details are held.
create or replace function public.screen_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p people;
  r role_assignments;
  o organisations;
  t threads;
  hit text := null;
begin
  if public.is_admin_context() and public.active_person_id() is null then return new; end if;
  select * into p from people where id = public.active_person_id();
  select * into r from role_assignments where person_id = p.id and status in ('active', 'outgoing') order by created_at limit 1;
  select * into o from organisations where id = r.org_id;
  select * into t from threads where id = new.thread_id;
  new.person_id := p.id;
  new.author_name := p.display_name;
  new.author_is_minor := p.is_minor;
  new.author_role := coalesce(nullif(trim(r.local_title), ''), initcap(replace(r.role, '_', ' ')), '');
  new.author_org := coalesce(o.name, '');
  if new.body ~ '(\+?\d[\d\s-]{7,}\d)' or new.body ~* '\d{2,}x{2,}\d{2,}' then hit := 'phone number';
  elsif new.body ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]+' then hit := 'email address';
  elsif new.body ~* '\m(whatsapp|insta|instagram|snap|snapchat|telegram|discord|dm me|message me privately)\M' then hit := 'off-platform contact';
  elsif new.body ~* '(^|\s)@[a-z0-9_.]{3,}' then hit := 'social handle';
  end if;
  if hit is not null then
    new.hidden := true;
    new.flagged := true;
    insert into safeguarding_reports (reporter_contact, subject_ref, category, details, status, actions)
    values ('Automatic flag', format('Post in “%s”', t.title), 'privacy', format('Post held because it looked like it contained a %s.', hit), 'new',
            jsonb_build_array(jsonb_build_object('at', now(), 'note', format('Held by filter (%s).', hit))));
  end if;
  new.created_at := now();
  return new;
end $$;
create trigger post_screen before insert on public.posts for each row execute function public.screen_post();

-- Threads record their creator from the session.
create or replace function public.stamp_thread() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then return new; end if;
  new.created_by := public.active_person_id();
  return new;
end $$;
create trigger thread_stamp before insert on public.threads for each row execute function public.stamp_thread();

-- Link a new sign-in to the person a school invited with the same email.
create or replace function public.link_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('ekoa.linking', 'on', true);
  update people set auth_user_id = new.id where lower(email) = lower(new.email) and auth_user_id is null;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.link_auth_user();

-- ---------------------------------------------------------------- Narrow functions

-- Guardians are not signed in. They can see only a first name and the current choices.
create or replace function public.consent_lookup(p_token text)
returns table (first_name text, scope jsonb, granted boolean)
language sql stable security definer set search_path = public as $$
  select split_part(p.display_name, ' ', 1), c.scope, c.granted_at is not null and c.withdrawn_at is null
  from consent_records c join people p on p.id = c.person_id
  where c.token = p_token
$$;

create or replace function public.grant_consent(p_token text, p_guardian_name text, p_scope jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare c consent_records;
begin
  select * into c from consent_records where token = p_token;
  if c.id is null then raise exception 'invalid consent link'; end if;
  if length(trim(p_guardian_name)) < 3 then raise exception 'Type your full name to confirm.'; end if;
  perform set_config('ekoa.consent', 'on', true);
  update consent_records set guardian_name = trim(p_guardian_name), scope = p_scope, granted_at = now(), withdrawn_at = null where id = c.id;
  update people set consent_status = case when coalesce((p_scope ->> 'account')::boolean, false) then 'granted' else 'pending' end where id = c.person_id;
  insert into audit_log (actor_person_id, action, entity, entity_id) values (null, 'guardian consent recorded', 'consent_records', c.id::text);
end $$;

create or replace function public.withdraw_my_consent() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.current_person_id();
begin
  if me is null then raise exception 'Not signed in'; end if;
  update consent_records set withdrawn_at = now() where person_id = me;
  update people set consent_status = 'withdrawn' where id = me;
  insert into audit_log (actor_person_id, action, entity, entity_id) values (me, 'consent withdrawn', 'consent_records', me::text);
end $$;

-- Partners and peer schools verify records of other schools without write access to them.
create or replace function public.complete_verification(p_id uuid, p_verified boolean, p_notes text) returns void
language plpgsql security definer set search_path = public as $$
declare v verifications;
begin
  select * into v from verifications where id = p_id;
  if v.id is null then raise exception 'Verification request not found'; end if;
  if v.status not in ('requested', 'in_progress') then raise exception 'This request is already closed.'; end if;
  if v.verifier_org = (select org_id from records where id = v.record_id) then raise exception 'A school cannot audit its own records.'; end if;
  if not public.is_steward() then
    if v.requested_tier = 3 and not (public.is_audit_school(v.verifier_org) and public.has_role(v.verifier_org, array['auditor', 'faculty_liaison'])) then
      raise exception 'Only an auditor at the Ekoa audit school can complete a T3 peer audit.';
    end if;
    if v.requested_tier = 4 and not public.has_role(v.verifier_org, array['partner', 'faculty_liaison']) then
      raise exception 'Only the partner organisation can complete T4 verification.';
    end if;
    if not public.can_cross_school() then raise exception 'Auditing other schools needs guardian consent for cross-school work.'; end if;
  end if;
  if length(trim(coalesce(p_notes, ''))) < 3 then raise exception 'Note what you checked.'; end if;
  update verifications set status = case when p_verified then 'verified' else 'declined' end, notes = p_notes where id = p_id;
  if p_verified then
    perform set_config('ekoa.verifying', 'on', true);
    update records set
      tier = greatest(tier, v.requested_tier),
      outcomes = (select coalesce(jsonb_agg(o || jsonb_build_object('tier', greatest((o ->> 'tier')::int, v.requested_tier))), '[]'::jsonb) from jsonb_array_elements(outcomes) o)
    where id = v.record_id;
  end if;
  insert into audit_log (actor_person_id, action, entity, entity_id)
  values (public.active_person_id(), case when p_verified then format('verified record T%s', v.requested_tier) else 'declined verification' end, 'records', v.record_id::text);
end $$;

create or replace function public.bump_clause_adoptions(p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_liaison_anywhere() or public.is_steward()) then raise exception 'Not allowed'; end if;
  update policy_clauses set adoption_count = adoption_count + 1 where id = any (p_ids);
end $$;

grant execute on function public.consent_lookup(text) to anon, authenticated;
grant execute on function public.grant_consent(text, text, jsonb) to anon, authenticated;
grant execute on function public.withdraw_my_consent() to authenticated;
grant execute on function public.complete_verification(uuid, boolean, text) to authenticated;
grant execute on function public.bump_clause_adoptions(uuid[]) to authenticated;

-- ---------------------------------------------------------------- Evidence storage
insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false) on conflict (id) do nothing;

create policy evidence_files_read on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (
    public.is_member(((storage.foldername(name))[1])::uuid) or public.is_steward()
    or exists (select 1 from evidence e where e.storage_path = name and e.project_id is not null and not e.contains_people and public.audits_project(e.project_id))
  ));
create policy evidence_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.can_write(((storage.foldername(name))[1])::uuid));
