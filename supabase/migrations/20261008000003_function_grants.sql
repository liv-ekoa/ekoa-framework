-- Ekoa: who may call which function directly.
-- Postgres lets everyone execute new functions by default, and Supabase exposes every function in
-- `public` at /rest/v1/rpc. Trigger functions never need direct calls, the role helpers are needed
-- only by signed-in users' row policies, and only the guardian consent pair is for visitors.

-- Trigger functions: nobody calls these directly (triggers still fire).
revoke execute on function
  public.stamp_adaptation(), public.guard_verification_request(), public.guard_stage_gate(),
  public.guard_measurement(), public.guard_record(), public.guard_people(), public.guard_policy(),
  public.screen_post(), public.stamp_thread(), public.link_auth_user()
from public, anon, authenticated;

-- Role helpers used inside row policies: signed-in users only.
revoke execute on function
  public.current_person_id(), public.active_person_id(), public.is_steward(), public.is_partner(),
  public.is_liaison_anywhere(), public.is_member(uuid), public.has_role(uuid, text[]), public.can_write(uuid),
  public.in_network(), public.can_cross_school(), public.project_org(uuid), public.proposal_org(uuid),
  public.policy_org(uuid), public.is_audit_school(uuid), public.audits_record(uuid), public.audits_project(uuid)
from public, anon;
grant execute on function
  public.current_person_id(), public.active_person_id(), public.is_steward(), public.is_partner(),
  public.is_liaison_anywhere(), public.is_member(uuid), public.has_role(uuid, text[]), public.can_write(uuid),
  public.in_network(), public.can_cross_school(), public.project_org(uuid), public.proposal_org(uuid),
  public.policy_org(uuid), public.is_audit_school(uuid), public.audits_record(uuid), public.audits_project(uuid)
to authenticated;

-- Visitors read organisations through a policy that asks whether they are in the network.
grant execute on function public.in_network() to anon;

-- Signed-in actions.
revoke execute on function public.withdraw_my_consent(), public.complete_verification(uuid, boolean, text), public.bump_clause_adoptions(uuid[]) from public, anon;
grant execute on function public.withdraw_my_consent(), public.complete_verification(uuid, boolean, text), public.bump_clause_adoptions(uuid[]) to authenticated;

-- Guardians use their consent link without signing in.
revoke execute on function public.consent_lookup(text), public.grant_consent(text, text, jsonb) from public;
grant execute on function public.consent_lookup(text), public.grant_consent(text, text, jsonb) to anon, authenticated;

-- public_records and public_school_ranking deliberately run with the owner's rights: they are the
-- only window visitors have onto records, and they expose published public rows only, with
-- anonymised records stripped of school, project and city.
