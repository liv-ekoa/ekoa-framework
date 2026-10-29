-- Review fixes for the October 27 student feedback migration.
-- 1. A phone number needs 10 or more digits, so dates and measurements are not held as contact details.
-- 2. A guardian's email can never be the student's own, so a minor cannot consent for themselves.
-- 3. Photos moved with a student's projects stay readable to the school they moved to.
-- 4. Collaborator suggestions need cross-school consent and show only schools that are public.

-- ---------------------------------------------------------------- 1. Phone numbers

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
  if exists (select 1 from regexp_matches(p_text, '\+?\d[\d\s-]{7,}\d', 'g') m where length(regexp_replace(m[1], '\D', '', 'g')) >= 10)
     or p_text ~* '\d{2,}x{2,}\d{2,}' or p_text ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]+'
     or p_text ~* '\m(whatsapp|insta|instagram|snap|snapchat|telegram|discord|dm me|message me privately)\M' or p_text ~* '(^|\s)@[a-z0-9_.]{3,}' then
    return 'contact';
  end if;
  return null;
end $$;

revoke execute on function public.moderation_hit(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. Guardian is not the student

create or replace function public.check_guardian_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(trim(new.guardian_email)) = (select lower(email) from people where id = new.person_id) then
    raise exception 'A parent or guardian needs their own email address, not the student''s.';
  end if;
  return new;
end $$;
create trigger consent_guardian_check before insert or update of guardian_email on public.consent_records
  for each row execute function public.check_guardian_email();
revoke execute on function public.check_guardian_email() from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. Moved photos stay readable

-- assign_student moves an independent student's evidence to their school, but the files stay in
-- storage under the old workspace's folder, so the folder-based check no longer matched the new owner.
alter policy evidence_files_read on storage.objects using (
  bucket_id = 'evidence'
  and (
    public.is_member(((storage.foldername(name))[1])::uuid) or public.is_steward()
    or exists (select 1 from evidence e where e.storage_path = name and public.is_member(e.org_id))
    or exists (select 1 from evidence e where e.storage_path = name and e.project_id is not null and not e.contains_people and public.audits_project(e.project_id))
  )
  and not exists (
    select 1 from evidence e where e.storage_path = name and e.hidden and not (public.is_steward() or public.has_role(e.org_id, array['faculty_liaison']))
  )
);

-- ---------------------------------------------------------------- 4. Collaborator suggestions

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
    select o.id, o.name, o.city, o.country, o.public_visible, coalesce(c.c, '{}') as c, coalesce(k.k, '{}') as k, coalesce(w.w, '{}') as w
    from organisations o
    left join clauses c on c.org_id = o.id left join keys k on k.org_id = o.id left join words w on w.org_id = o.id
    where o.id in (select org_id from secs)
  ),
  me as (select * from prof where id = p_org and (public.is_steward() or (public.is_member(p_org) and public.can_cross_school()))),
  pairs as (
    select other.*, me.c as mc, me.k as mk, me.w as mw,
      array(select unnest(me.c) intersect select unnest(other.c)) as ic,
      array(select unnest(me.k) intersect select unnest(other.k)) as ik,
      array(select unnest(me.w) intersect select unnest(other.w)) as iw
    from me join prof other on other.id <> me.id and (other.public_visible or public.is_steward())
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
