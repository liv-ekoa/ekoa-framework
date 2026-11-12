-- Ekoa: October 27 feedback.
-- 1. Anything inappropriate (bullying, sexual content, violence, hate, self-harm, contact details)
--    is hidden the moment it is posted or reported, and goes to the author's teacher and the stewards.
-- 2. Collaborator schools, suggested by how similar their policies are (replacing twin schools).
-- 3. Helpful links on a school's policy, added by any member of the school.
-- 4. Independent students: students can join without their school, and Ekoa admins (stewards)
--    assign roles to the students that schools list when they register.

-- ---------------------------------------------------------------- 1. Content safety

create or replace function public.moderation_hit(p_text text) returns text
language plpgsql immutable set search_path = public as $$
-- Generated from src/lib/moderation.ts by `npm run moderation:sql`. Edit the TypeScript, not this.
declare t text := regexp_replace(translate(lower(coalesce(p_text, '')), '013457@$', 'oieastas'), '(.)\1{2,}', '\1', 'g');
begin
  if t ~ '\m(kill(ing)? myself|end(ing)? my life|end it all|want(ed)? to die|wanna die|suicid(e|al)|self[ -]?harm(ing)?|cut(ting)? myself|hurt(ing)? myself|kms|no reason to live|better off dead)\M' then return 'self_harm'; end if;
  if t ~ '\m((i''?ll|i will|i''?m gonna|im gonna|i am going to|gonna) (kill|hurt|beat|stab|shoot|punch|attack|murder) (you|u|him|her|them|everyone|you all)|(bring|bringing) an? (gun|knife|weapon) to school|(shoot|bomb|blow) up (the|this|our|your) school|(you''?re|you are|ur) dead|watch your back|i''?ll find (you|u))\M' then return 'violence'; end if;
  if t ~ '\m(niggas?|niggers?|fags?|faggots?|chinks?|pakis?|kikes?|spics?|trann(y|ies)|towelheads?|ragheads?|go back to your (own )?country)\M' then return 'hate'; end if;
  if t ~ '\m(porn(o|ography)?|nudes?|naked|sex|sexy|sexting|horny|boobs|tits|dick|penis|vagina|pussy|blow ?job|onlyfans|send (me )?(pics|nudes|photos of you)|hot pics|kontol|memek|ngentot|chudai)\M' then return 'sexual'; end if;
  if t ~ '\m(kill yourself|kys|go die|(nobody|no one) likes you|every(one|body) hates you|(you''?re|you are|ur|u r|youre|you guys are|you all are) (all |all such |so |such an? |an? |the |a bunch of )?(stupid|idiots?|dumb|ugly|fat|losers?|worthless|pathetic|disgusting|useless|morons?|freaks?|failures?)|idiots?|morons?|losers?|retard(s|ed)?|dumbass(es)?|jackass(es)?|fuck(ing|er|ed)?|motherfucker|shit|bullshit|bitch(es)?|bastard|asshole|dickhead|cunt|wanker|twat|slut|whore|chutiy(a|e)|madarchod|b(h)?enchod|bhosdike|gaa?ndu|randi|harami|kamina|bangsat|bajingan|goblok|tolol)\M' then return 'bullying'; end if;
  if p_text ~ '(\+?\d[\d\s-]{7,}\d)' or p_text ~* '\d{2,}x{2,}\d{2,}' or p_text ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]+'
     or p_text ~* '\m(whatsapp|insta|instagram|snap|snapchat|telegram|discord|dm me|message me privately)\M' or p_text ~* '(^|\s)@[a-z0-9_.]{3,}' then
    return 'contact';
  end if;
  return null;
end $$;


alter table public.posts add column flag_reason text;
alter table public.evidence add column hidden boolean not null default false;

create table public.policy_links (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  url text not null check (url ~* '^https://[^\s<>"]+$' and length(url) <= 2000),
  title text not null check (length(trim(title)) between 2 and 140),
  note text not null default '' check (length(note) <= 500),
  added_by uuid references public.people (id) on delete set null,
  added_by_name text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.policy_links (policy_id);

create table public.content_flags (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('post', 'evidence', 'policy_link', 'upload')),
  target_id uuid not null,
  -- The school responsible: the author's school. Its faculty liaison reviews the flag.
  org_id uuid references public.organisations (id) on delete cascade,
  reason text not null check (reason in ('self_harm', 'violence', 'hate', 'sexual', 'bullying', 'contact', 'other')),
  source text not null check (source in ('filter', 'report')),
  reporter_person_id uuid references public.people (id) on delete set null,
  excerpt text not null default '',
  note text not null default '' check (length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'removed', 'restored')),
  decided_by uuid references public.people (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.content_flags (org_id, status);
create index on public.content_flags (target_id);
alter table public.content_flags enable row level security;
alter table public.policy_links enable row level security;

-- Stamp who reported, which school is responsible and what was said, from the database.
create or replace function public.prepare_flag() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_excerpt text;
begin
  if not public.is_admin_context() then
    if coalesce(current_setting('ekoa.filtering', true), '') <> 'on' then
      -- People report; only the database's own filter (or a blocked upload) files 'filter' flags.
      new.source := case when new.target_kind = 'upload' then 'filter' else 'report' end;
      new.reporter_person_id := public.active_person_id();
      if new.reporter_person_id is null then raise exception 'Sign in to report something.'; end if;
      if (select count(*) from content_flags f where f.reporter_person_id = new.reporter_person_id and f.created_at > now() - interval '1 day') >= 30 then
        raise exception 'You have sent a lot of reports today. Please tell your teacher directly.';
      end if;
    end if;
    new.status := 'open';
    new.decided_by := null;
    new.decided_at := null;
  end if;
  if new.target_kind = 'post' then
    select coalesce((select r.org_id from role_assignments r where r.person_id = p.person_id and r.status <> 'alumni' order by r.created_at limit 1), t.org_id),
           left(p.body, 280)
      into v_org, v_excerpt
      from posts p join threads t on t.id = p.thread_id where p.id = new.target_id;
  elsif new.target_kind = 'evidence' then
    select e.org_id, left(coalesce(nullif(e.caption, ''), e.file_name), 280) into v_org, v_excerpt from evidence e where e.id = new.target_id;
  elsif new.target_kind = 'policy_link' then
    select l.org_id, left(l.title || ' (' || l.url || ')', 280) into v_org, v_excerpt from policy_links l where l.id = new.target_id;
  else
    v_org := (select r.org_id from role_assignments r where r.person_id = coalesce(new.reporter_person_id, public.active_person_id()) and r.status <> 'alumni' order by r.created_at limit 1);
    v_excerpt := left(coalesce(new.excerpt, ''), 280);
  end if;
  if new.target_kind <> 'upload' and v_excerpt is null then raise exception 'There is nothing to report here.'; end if;
  new.org_id := v_org;
  new.excerpt := coalesce(v_excerpt, '');
  return new;
end $$;
create trigger flag_prepare before insert on public.content_flags for each row execute function public.prepare_flag();

-- The removal is immediate: the item is hidden as soon as the flag exists.
create or replace function public.apply_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.target_kind = 'post' then
    update posts set hidden = true, flagged = true where id = new.target_id;
  elsif new.target_kind = 'evidence' then
    update evidence set hidden = true where id = new.target_id;
  elsif new.target_kind = 'policy_link' then
    update policy_links set hidden = true where id = new.target_id;
  end if;
  if new.reason in ('self_harm', 'contact') then
    insert into safeguarding_reports (reporter_person_id, reporter_contact, subject_ref, category, details, status, actions)
    values (new.reporter_person_id, case when new.source = 'filter' then 'Automatic flag' else 'Reported by a member' end,
            format('Flagged %s', replace(new.target_kind, '_', ' ')),
            case when new.reason = 'self_harm' then 'wellbeing' else 'privacy' end,
            format('Hidden because it looked like %s: "%s"', case new.reason when 'self_harm' then 'someone may be at risk' else 'it shared contact details' end, new.excerpt),
            'new', jsonb_build_array(jsonb_build_object('at', now(), 'note', 'Hidden at once; the school''s faculty liaison was alerted.')));
  end if;
  return null;
end $$;
create trigger flag_apply after insert on public.content_flags for each row execute function public.apply_flag();

-- A teacher or steward decides: remove for good, or restore if the filter got it wrong.
create or replace function public.decide_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then return new; end if;
  new.target_kind := old.target_kind; new.target_id := old.target_id; new.org_id := old.org_id; new.reason := old.reason;
  new.source := old.source; new.reporter_person_id := old.reporter_person_id; new.excerpt := old.excerpt; new.created_at := old.created_at;
  if new.status is not distinct from old.status then return new; end if;
  new.decided_by := public.active_person_id();
  new.decided_at := now();
  if new.status = 'removed' then
    if new.target_kind = 'post' then update posts set body = '[Removed by a moderator]', hidden = false, flagged = true where id = new.target_id; end if;
    if new.target_kind = 'evidence' then update evidence set hidden = true where id = new.target_id; end if;
    if new.target_kind = 'policy_link' then update policy_links set hidden = true where id = new.target_id; end if;
  elsif new.status = 'restored' then
    if not exists (select 1 from content_flags f where f.target_id = new.target_id and f.id <> new.id and f.status = 'open') then
      if new.target_kind = 'post' then update posts set hidden = false, flagged = false where id = new.target_id; end if;
      if new.target_kind = 'evidence' then update evidence set hidden = false where id = new.target_id; end if;
      if new.target_kind = 'policy_link' then update policy_links set hidden = false where id = new.target_id; end if;
    end if;
  end if;
  -- One decision settles every open report about the same item.
  if pg_trigger_depth() = 1 then
    update content_flags set status = new.status where target_id = new.target_id and id <> new.id and status = 'open';
  end if;
  return new;
end $$;
create trigger flag_decide before update on public.content_flags for each row execute function public.decide_flag();

create policy flags_report on public.content_flags for insert to authenticated with check (
  reporter_person_id = public.active_person_id() and (
    (target_kind = 'post' and exists (select 1 from posts p where p.id = target_id))
    or (target_kind = 'evidence' and exists (select 1 from evidence e where e.id = target_id))
    or (target_kind = 'policy_link' and exists (select 1 from policy_links l where l.id = target_id))
    or target_kind = 'upload'
  )
);
create policy flags_read on public.content_flags for select to authenticated using (
  public.is_steward() or public.has_role(org_id, array['faculty_liaison']) or reporter_person_id = public.current_person_id()
);
create policy flags_decide on public.content_flags for update to authenticated using (public.is_steward() or public.has_role(org_id, array['faculty_liaison']));

-- Posts: the screening now covers bullying, sexual content, violence, hate and self-harm as well as
-- contact details. Author fields still come from the database, never the client.
create or replace function public.screen_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p people;
  r role_assignments;
  o organisations;
begin
  if public.is_admin_context() and public.active_person_id() is null then
    new.flag_reason := public.moderation_hit(new.body);
    if new.flag_reason is not null then new.hidden := true; new.flagged := true; end if;
    return new;
  end if;
  select * into p from people where id = public.active_person_id();
  select * into r from role_assignments where person_id = p.id and status in ('active', 'outgoing') order by created_at limit 1;
  select * into o from organisations where id = r.org_id;
  new.person_id := p.id;
  new.author_name := p.display_name;
  new.author_is_minor := p.is_minor;
  new.author_role := coalesce(nullif(trim(r.local_title), ''), initcap(replace(r.role, '_', ' ')), '');
  new.author_org := coalesce(o.name, '');
  new.flag_reason := public.moderation_hit(new.body);
  new.hidden := new.flag_reason is not null;
  new.flagged := new.flag_reason is not null;
  new.created_at := now();
  return new;
end $$;

create or replace function public.flag_screened() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_reason text;
begin
  if tg_table_name = 'posts' then v_reason := new.flag_reason;
  elsif tg_table_name = 'evidence' then v_reason := public.moderation_hit(new.caption);
  else v_reason := public.moderation_hit(new.title || ' ' || new.note);
  end if;
  if v_reason is null then return null; end if;
  perform set_config('ekoa.filtering', 'on', true);
  insert into content_flags (target_kind, target_id, reason, source)
  values (case tg_table_name when 'posts' then 'post' when 'evidence' then 'evidence' else 'policy_link' end, new.id, v_reason, 'filter');
  perform set_config('ekoa.filtering', 'off', true);
  return null;
end $$;
create trigger post_flag after insert on public.posts for each row execute function public.flag_screened();
create trigger evidence_flag after insert on public.evidence for each row execute function public.flag_screened();

-- Thread titles are seen by everyone in a circle, so an inappropriate title is refused outright.
create or replace function public.screen_thread() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_reason text := public.moderation_hit(new.title);
begin
  if v_reason is not null and not public.is_admin_context() then
    raise exception 'Please choose a different title. This one looks like it contains %.', replace(v_reason, '_', ' ');
  end if;
  return new;
end $$;
create trigger thread_screen before insert or update of title on public.threads for each row execute function public.screen_thread();

-- Circles and school-to-school conversations are cross-school spaces: students under 18 need their
-- guardian's cross-school consent to read or write in them, even when their own school started them.
alter policy threads_read on public.threads using (
  public.is_steward()
  or (kind = 'partner_request' and public.in_network())
  or (kind = 'circle' and public.can_cross_school())
  or (kind = 'twin' and public.can_cross_school() and (public.is_member(org_id) or public.is_member(org_b)))
);
alter policy threads_insert on public.threads with check (
  created_by = public.active_person_id()
  and (kind = 'partner_request' or public.can_cross_school())
  and (org_id is null or public.is_member(org_id) or public.is_steward())
);

-- Hidden photos disappear for everyone except the school's liaison and the stewards.
alter policy evidence_read on public.evidence using (
  (public.is_member(org_id) or public.is_steward() or (project_id is not null and not contains_people and public.audits_project(project_id)))
  and (not hidden or public.is_steward() or public.has_role(org_id, array['faculty_liaison']))
);
alter policy evidence_files_read on storage.objects using (
  bucket_id = 'evidence'
  and (
    public.is_member(((storage.foldername(name))[1])::uuid) or public.is_steward()
    or exists (select 1 from evidence e where e.storage_path = name and e.project_id is not null and not e.contains_people and public.audits_project(e.project_id))
  )
  and not exists (
    select 1 from evidence e where e.storage_path = name and e.hidden and not (public.is_steward() or public.has_role(e.org_id, array['faculty_liaison']))
  )
);

-- ---------------------------------------------------------------- 3. Helpful links on policies

create or replace function public.prepare_policy_link() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.org_id := public.policy_org(new.policy_id);
  if public.is_admin_context() then return new; end if;
  new.added_by := public.active_person_id();
  new.added_by_name := coalesce((select display_name from people where id = new.added_by), '');
  new.hidden := false;
  new.url := trim(new.url);
  new.title := trim(new.title);
  new.created_at := now();
  return new;
end $$;
create trigger policy_link_prepare before insert on public.policy_links for each row execute function public.prepare_policy_link();
create trigger policy_link_flag after insert on public.policy_links for each row execute function public.flag_screened();

create policy policy_links_read on public.policy_links for select to authenticated using (
  (public.is_member(org_id) or public.is_steward())
  and (not hidden or public.is_steward() or public.has_role(org_id, array['faculty_liaison']))
);
create policy policy_links_add on public.policy_links for insert to authenticated with check (
  public.is_member(org_id) and added_by = public.active_person_id()
);
create policy policy_links_remove on public.policy_links for delete to authenticated using (
  added_by = public.current_person_id() or public.has_role(org_id, array['faculty_liaison']) or public.is_steward()
);

-- ---------------------------------------------------------------- 2. Collaborator schools

-- How alike two schools' policies are, from 0 to 1: shared library clauses count most (50%), then the
-- distinctive words both policies use (30%), then which policy sections both cover (20%).
-- Each school sees the same score for the other, and only scores and shared headings leave the
-- function, never another school's policy text.
create or replace function public.collaborator_suggestions(p_org uuid)
returns table (org_id uuid, name text, city text, country text, score numeric, shared_clauses text[], shared_sections text[], shared_terms text[])
language sql stable security definer set search_path = public as $$
  with secs as (
    select p.org_id, s.value as sec
    from policies p
    join organisations o on o.id = p.org_id and o.org_type = 'school' and o.status in ('active', 'onboarding')
    cross join lateral jsonb_array_elements(p.sections) s
  ),
  clauses as (select org_id, array_agg(distinct sec ->> 'clause_id') filter (where coalesce(sec ->> 'clause_id', '') <> '') as c from secs group by org_id),
  keys as (select org_id, array_agg(distinct coalesce(nullif(sec ->> 'title', ''), sec ->> 'key')) as k from secs group by org_id),
  words as (
    select org_id, array_agg(distinct w) as w
    from secs, regexp_split_to_table(lower(coalesce(sec ->> 'title', '') || ' ' || coalesce(sec ->> 'body', '')), '[^a-z]+') as w
    where length(w) >= 5 and w not in (
      'about', 'after', 'again', 'along', 'among', 'being', 'below', 'could', 'every', 'their', 'there', 'these', 'thing', 'those', 'through',
      'under', 'until', 'which', 'while', 'where', 'would', 'should', 'other', 'shall', 'within', 'without', 'school', 'schools', 'student',
      'students', 'project', 'projects', 'policy', 'policies', 'sustainability', 'sustainable', 'staff', 'year', 'years', 'including', 'ensure')
    group by org_id
  ),
  prof as (
    select o.id, o.name, o.city, o.country, coalesce(c.c, '{}') as c, coalesce(k.k, '{}') as k, coalesce(w.w, '{}') as w
    from organisations o
    left join clauses c on c.org_id = o.id left join keys k on k.org_id = o.id left join words w on w.org_id = o.id
    where o.id in (select org_id from secs)
  ),
  me as (select * from prof where id = p_org and (public.is_member(p_org) or public.is_steward())),
  pairs as (
    select other.*, me.c as mc, me.k as mk, me.w as mw,
      array(select unnest(me.c) intersect select unnest(other.c)) as ic,
      array(select unnest(me.k) intersect select unnest(other.k)) as ik,
      array(select unnest(me.w) intersect select unnest(other.w)) as iw
    from me join prof other on other.id <> me.id
  ),
  scored as (
    select *,
      0.5 * coalesce(cardinality(ic)::numeric / nullif(cardinality(array(select unnest(mc) union select unnest(c))), 0), 0)
      + 0.2 * coalesce(cardinality(ik)::numeric / nullif(cardinality(array(select unnest(mk) union select unnest(k))), 0), 0)
      + 0.3 * coalesce(cardinality(iw)::numeric / nullif(cardinality(array(select unnest(mw) union select unnest(w))), 0), 0) as s
    from pairs
  )
  select id, name, city, country, round(s, 3),
    array(select pc.title from policy_clauses pc where pc.id::text = any (ic) order by pc.title),
    ik,
    array(select t from unnest(iw) t order by length(t) desc, t limit 8)
  from scored
  where s >= 0.15
  order by s desc, name
  limit 8
$$;

-- ---------------------------------------------------------------- 4. Independent students

alter table public.organisations drop constraint organisations_org_type_check;
alter table public.organisations add constraint organisations_org_type_check check (org_type in ('school', 'partner', 'ekoa', 'independent'));
comment on column public.organisations.org_type is 'independent: the personal workspace of a student who joined without their school.';
alter table public.organisations add column school_name text not null default '';

alter table public.applications add column kind text not null default 'school' check (kind in ('school', 'students', 'other'));
alter table public.applications add column org_id uuid references public.organisations (id) on delete set null;
alter table public.applications add column student_emails text[] not null default '{}' check (cardinality(student_emails) <= 500);

-- Visitors register schools; a school's own liaison can also send more student emails later.
alter policy applications_submit on public.applications to anon with check (status = 'new' and notes = '' and org_id is null);
create policy applications_submit_member on public.applications for insert to authenticated with check (
  status = 'new' and notes = '' and (org_id is null or public.has_role(org_id, array['faculty_liaison']))
);

-- A student signs up without their school. They get a private workspace where they lead their own
-- projects. Under-18s stay switched off until a guardian consents through their link.
create or replace function public.register_independent_student(p_name text, p_age_band text, p_school text, p_country text, p_city text, p_guardian_name text, p_guardian_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_person uuid;
  v_org uuid;
  v_minor boolean := coalesce(p_age_band, '') <> '18+';
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  if exists (select 1 from people where auth_user_id = v_uid) then raise exception 'You already have an Ekoa account.'; end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then raise exception 'Sign in first.'; end if;
  if exists (select 1 from people where lower(email) = lower(v_email)) then
    raise exception 'This email already belongs to an Ekoa account. Ask your teacher or an Ekoa admin.';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Add your name.'; end if;
  if coalesce(p_age_band, '') not in ('13-15', '16-17', '18+') then raise exception 'Choose your age group.'; end if;
  if v_minor and coalesce(p_guardian_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Students under 18 need a parent''s or guardian''s email.';
  end if;
  insert into people (display_name, email, age_band, is_minor, auth_user_id)
  values (trim(p_name), lower(v_email), p_age_band, v_minor, v_uid) returning id into v_person;
  insert into organisations (name, org_type, country, city, status, public_visible, school_name)
  values (trim(p_name) || ' (independent)', 'independent', coalesce(trim(p_country), ''), coalesce(trim(p_city), ''), 'active', false, coalesce(trim(p_school), ''))
  returning id into v_org;
  insert into role_assignments (person_id, org_id, role, status, local_title) values (v_person, v_org, 'project_lead', 'active', 'Independent student');
  if v_minor then
    insert into consent_records (person_id, guardian_name, guardian_email, terms_version)
    values (v_person, coalesce(trim(p_guardian_name), ''), lower(trim(p_guardian_email)), '2026-10');
  end if;
  insert into audit_log (actor_person_id, action, entity, entity_id) values (v_person, 'joined as an independent student', 'people', v_person::text);
  return v_person;
end $$;

-- Ekoa admins (stewards) give a student a role in a school: a student a school listed, or an
-- independent student whose school has now joined (their projects can move with them).
create or replace function public.assign_student(p_email text, p_name text, p_age_band text, p_org uuid, p_role text, p_local_title text, p_guardian_name text, p_guardian_email text, p_move_projects boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_person uuid;
  v_minor boolean;
  v_independent uuid[];
begin
  if not public.is_steward() then raise exception 'Only Ekoa admins can assign roles here.'; end if;
  if (select org_type from organisations where id = p_org) is distinct from 'school' then raise exception 'Choose a school.'; end if;
  if p_role not in ('project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'auditor', 'alumni') then raise exception 'Choose a student role.'; end if;
  select id into v_person from people where lower(email) = lower(trim(p_email));
  if v_person is null then
    if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Add the student''s name.'; end if;
    if coalesce(p_age_band, '') not in ('13-15', '16-17', '18+') then raise exception 'Choose the student''s age group.'; end if;
    v_minor := p_age_band <> '18+';
    if v_minor and coalesce(p_guardian_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Students under 18 need a parent''s or guardian''s email.';
    end if;
    insert into people (display_name, email, age_band, is_minor) values (trim(p_name), lower(trim(p_email)), p_age_band, v_minor) returning id into v_person;
    if v_minor then
      insert into consent_records (person_id, guardian_name, guardian_email, terms_version)
      values (v_person, coalesce(trim(p_guardian_name), ''), lower(trim(p_guardian_email)), '2026-10');
    end if;
  end if;
  if exists (select 1 from role_assignments where person_id = v_person and org_id = p_org and role = p_role and status <> 'alumni') then
    raise exception 'They already hold this role at that school.';
  end if;
  insert into role_assignments (person_id, org_id, role, status, local_title)
  values (v_person, p_org, p_role, 'active', nullif(trim(coalesce(p_local_title, '')), ''));
  if coalesce(p_move_projects, false) then
    select array_agg(r.org_id) into v_independent
    from role_assignments r join organisations o on o.id = r.org_id
    where r.person_id = v_person and o.org_type = 'independent' and r.status <> 'alumni';
    if v_independent is not null then
      update projects set org_id = p_org where org_id = any (v_independent);
      update records set org_id = p_org where org_id = any (v_independent);
      update evidence set org_id = p_org where org_id = any (v_independent);
      update role_assignments set status = 'alumni' where person_id = v_person and org_id = any (v_independent);
    end if;
  end if;
  insert into audit_log (actor_person_id, action, entity, entity_id) values (public.active_person_id(), format('assigned %s', p_role), 'role_assignments', v_person::text);
  return v_person;
end $$;

-- ---------------------------------------------------------------- Permissions

revoke execute on function
  public.prepare_flag(), public.apply_flag(), public.decide_flag(), public.screen_post(), public.flag_screened(),
  public.screen_thread(), public.prepare_policy_link()
from public, anon, authenticated;
revoke execute on function public.collaborator_suggestions(uuid), public.register_independent_student(text, text, text, text, text, text, text),
  public.assign_student(text, text, text, uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.collaborator_suggestions(uuid), public.register_independent_student(text, text, text, text, text, text, text),
  public.assign_student(text, text, text, uuid, text, text, text, text, boolean) to authenticated;
revoke execute on function public.moderation_hit(text) from public, anon, authenticated;
