-- Project chats are school-only: members of the project's school (and stewards) can read and start
-- them. The October 27 rules limit threads to cross-school kinds, so allow the 'project' kind here
-- without loosening any cross-school rule: it never needs cross-school consent because it never
-- leaves the school.
alter policy threads_read on public.threads using (
  public.is_steward()
  or (kind = 'partner_request' and public.in_network())
  or (kind = 'circle' and public.can_cross_school())
  or (kind = 'twin' and public.can_cross_school() and (public.is_member(org_id) or public.is_member(org_b)))
  or (kind = 'project' and public.is_member(org_id))
);
alter policy threads_insert on public.threads with check (
  created_by = public.active_person_id()
  and (kind in ('partner_request', 'project') or public.can_cross_school())
  and (org_id is null or public.is_member(org_id) or public.is_steward())
);
