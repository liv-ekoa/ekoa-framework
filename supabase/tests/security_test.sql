-- Security tests. Run on a throwaway local database after supabase_stubs.sql, the migrations
-- (skip the pgvector line if the extension is missing), seed.sql and bootstrap-steward.sql:
--   psql -d ekoa_test -f tests/security_test.sql 2>&1 | grep -E "PASS|FAIL"
-- Every line should say PASS.
\set QUIET on
-- Fixtures (as postgres, bypassing RLS)
insert into organisations (id, name, org_type, country, city, status, public_visible, student_count) values
 ('11111111-0000-0000-0000-000000000001','School A','school','India','Faridabad','active',true,1000),
 ('11111111-0000-0000-0000-000000000002','School B','school','Indonesia','Ubud','active',true,500);
insert into auth.users (id,email) values
 ('aaaaaaaa-0000-0000-0000-00000000000a','liaison.a@x.org'),('aaaaaaaa-0000-0000-0000-00000000000b','student.a@x.org'),
 ('aaaaaaaa-0000-0000-0000-00000000000c','minor.pending@x.org'),('aaaaaaaa-0000-0000-0000-00000000000d','student.b@x.org');
insert into people (id, auth_user_id, display_name, email, age_band, is_minor, consent_status) values
 ('22222222-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','Liaison A','liaison.a@x.org','18+',false,'not_needed'),
 ('22222222-0000-0000-0000-00000000000b','aaaaaaaa-0000-0000-0000-00000000000b','Student A','student.a@x.org','16-17',true,'granted'),
 ('22222222-0000-0000-0000-00000000000c','aaaaaaaa-0000-0000-0000-00000000000c','Pending Minor','minor.pending@x.org','13-15',true,'pending'),
 ('22222222-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-00000000000d','Student B','student.b@x.org','16-17',true,'granted');
insert into role_assignments (person_id, org_id, role) values
 ('22222222-0000-0000-0000-00000000000a','11111111-0000-0000-0000-000000000001','faculty_liaison'),
 ('22222222-0000-0000-0000-00000000000b','11111111-0000-0000-0000-000000000001','project_lead'),
 ('22222222-0000-0000-0000-00000000000c','11111111-0000-0000-0000-000000000001','implementation_team'),
 ('22222222-0000-0000-0000-00000000000d','11111111-0000-0000-0000-000000000002','ekoa_rep');
insert into consent_records (person_id, guardian_email, scope, terms_version, token, granted_at) values
 ('22222222-0000-0000-0000-00000000000b','g@x.org','{"account":true,"cross_school":true,"photos":false,"name_on_records":false}','2026-10','tok-b', now()),
 ('22222222-0000-0000-0000-00000000000c','g2@x.org','{"account":false,"cross_school":false,"photos":false,"name_on_records":false}','2026-10','tok-c', null),
 ('22222222-0000-0000-0000-00000000000d','g3@x.org','{"account":true,"cross_school":false,"photos":false,"name_on_records":false}','2026-10','tok-d', now());
insert into projects (id, org_id, title, category) values ('33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','A compost','Food'),('33333333-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000002','B bins','Waste');
insert into records (id, org_id, project_id, title, status, visibility, anonymised, tier, context) values
 ('44444444-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','A anon public','published','public',true,2,'{"city":"Faridabad","country":"India"}');

create or replace function t(label text, ok boolean) returns void language plpgsql as $$ begin raise notice '% %', case when ok then 'PASS' else 'FAIL' end, label; end $$;
grant execute on function t(text, boolean) to anon, authenticated;

-- 1. Student A sees own school project, not School B
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
select t('student sees own project', (select count(*) from projects where org_id='11111111-0000-0000-0000-000000000001') = 1);
select t('student cannot see other school project', (select count(*) from projects where org_id='11111111-0000-0000-0000-000000000002') = 0);
select t('student cannot see other school people', (select count(*) from people where id='22222222-0000-0000-0000-00000000000d') = 0);
-- 2. Student cannot self-verify T2
do $$ begin
  insert into measurements (project_id, metric_code, value, period_start, period_end, entered_role, tier) values ('33333333-0000-0000-0000-000000000001','diversion_rate',40,current_date-6,current_date,'project_lead',2);
  perform t('student T2 blocked', false);
exception when others then perform t('student T2 blocked: '||sqlerrm, true); end $$;
insert into measurements (project_id, metric_code, value, period_start, period_end, entered_role, tier) values ('33333333-0000-0000-0000-000000000001','diversion_rate',40,current_date-6,current_date,'project_lead',0);
select t('student T0 insert ok', (select count(*) from measurements) = 1);
do $$ begin
  update measurements set value = 99;
  perform t('measurement edit blocked', false);
exception when others then perform t('measurement edit blocked', true); end $$;
-- 3. Student cannot publish
do $$ begin
  insert into records (org_id, title, status, visibility, tier) values ('11111111-0000-0000-0000-000000000001','x','published','network',2);
  perform t('student publish blocked', false);
exception when others then perform t('student publish blocked', true); end $$;
-- 4. Student cannot grant own consent
do $$ begin
  update people set consent_status='granted' where id='22222222-0000-0000-0000-00000000000b';
  perform t('self consent: no update rights (0 rows) or blocked', true);
exception when others then perform t('self consent blocked', true); end $$;
-- 5. Post with phone number gets held
insert into threads (kind, title, org_id) values ('twin','A thread','11111111-0000-0000-0000-000000000001');
insert into posts (thread_id, body) select id, 'call me on +91 98765 43210' from threads where title='A thread';
reset role;
select t('phone post hidden', (select hidden and flagged from posts limit 1));
select t('author name from db', (select author_name = 'Student A' from posts limit 1));
select t('safeguarding report created', (select count(*) from safeguarding_reports) = 1);
-- 6. Student cannot read held post; liaison can
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
select t('student cannot read held post', (select count(*) from posts) = 0);
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select t('liaison reads held post', (select count(*) from posts) = 1);
-- 7. Liaison can verify T2
update measurements set tier = 2;
select t('liaison verified T2', (select tier from measurements limit 1) = 2);
-- 8. Pending minor sees nothing
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000c',false);
select t('pending minor sees no projects', (select count(*) from projects) = 0);
select t('pending minor sees own person row', (select count(*) from people where id='22222222-0000-0000-0000-00000000000c') = 1);
-- 9. Student B without cross-school consent cannot join circles or see circle threads
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
do $$ begin
  insert into circle_members (circle_id, person_id) select id, '22222222-0000-0000-0000-00000000000d' from circles limit 1;
  perform t('no-consent circle join blocked', false);
exception when others then perform t('no-consent circle join blocked', true); end $$;
reset role;
-- 10. Anonymous: public view hides anonymised school
set role anon; select set_config('request.jwt.claim.sub','',false);
select t('anon public record visible', (select count(*) from public_records) = 1);
select t('anon org hidden on anonymised', (select org_id is null and context->>'city' = '' from public_records limit 1));
select t('anon cannot read records table', (select count(*) from records) = 0);
select t('anon cannot read applications', (select count(*) from applications) = 0);
insert into applications (name, email) values ('X','x@y.z');
select t('anon can apply', true);
select t('consent lookup by token', (select first_name = 'Pending' from consent_lookup('tok-c')));
select grant_consent('tok-c', 'Guardian Name', '{"account":true,"cross_school":false,"photos":false,"name_on_records":false}');
reset role;
select t('guardian consent activated minor', (select consent_status = 'granted' from people where id='22222222-0000-0000-0000-00000000000c'));
-- 11. New auth user links to invited person
insert into people (display_name, email, age_band, is_minor, consent_status) values ('New Teacher','new.t@x.org','18+',false,'not_needed');
insert into auth.users (email) values ('NEW.T@x.org');
select t('auth user linked by email', (select auth_user_id is not null from people where email='new.t@x.org'));
-- 12. Gate signing role
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
do $$ begin
  insert into stage_gates (project_id, stage) values ('33333333-0000-0000-0000-000000000001','design');
  perform t('student cannot sign design gate', false);
exception when others then perform t('student cannot sign design gate', true); end $$;
insert into stage_gates (project_id, stage) values ('33333333-0000-0000-0000-000000000001','identify');
select t('head signs identify gate', (select count(*) from stage_gates) = 1);
reset role;
insert into organisations (id, name, org_type, country, city, status) values ('11111111-0000-0000-0000-000000000009','Partner Org','partner','India','Bengaluru','active');
insert into auth.users (id,email) values ('aaaaaaaa-0000-0000-0000-00000000000e','partner@x.org');
insert into people (id, auth_user_id, display_name, email, age_band, is_minor) values ('22222222-0000-0000-0000-00000000000e','aaaaaaaa-0000-0000-0000-00000000000e','Partner P','partner@x.org','18+',false);
insert into role_assignments (person_id, org_id, role) values ('22222222-0000-0000-0000-00000000000e','11111111-0000-0000-0000-000000000009','partner');
insert into verifications (id, record_id, requested_tier, requested_by_org, verifier_org) values ('55555555-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001',4,'11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000009');
insert into policies (id, org_id, title) values ('66666666-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Policy');
-- Student B (other school) cannot complete the partner's verification
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
do $$ begin perform complete_verification('55555555-0000-0000-0000-000000000001', true, 'looks fine'); perform t('outsider verification blocked', false);
exception when others then perform t('outsider verification blocked', true); end $$;
-- Partner can
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000e',false);
select complete_verification('55555555-0000-0000-0000-000000000001', true, 'Checked raw logs and photos');
reset role;
select t('partner raised record to T4', (select tier = 4 from records where id='44444444-0000-0000-0000-000000000001'));
-- Student cannot adopt a policy; liaison can
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
do $$ begin update policies set status = 'adopted' where id='66666666-0000-0000-0000-000000000001'; perform t('student adopt blocked', false);
exception when others then perform t('student adopt blocked', true); end $$;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
update policies set status = 'adopted' where id='66666666-0000-0000-0000-000000000001';
reset role;
select t('liaison adopted policy', (select status = 'adopted' from policies where id='66666666-0000-0000-0000-000000000001'));
-- Student cannot raise a record to T3 directly
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
do $$ begin update records set tier = 3 where id='44444444-0000-0000-0000-000000000001' and false; insert into records (org_id, title, tier) values ('11111111-0000-0000-0000-000000000001','t3 attempt',3); perform t('direct T3 blocked', false);
exception when others then perform t('direct T3 blocked', true); end $$;
reset role;
-- ================================================================ Peer audit, budgets, ranking (Oct 2026)
insert into organisations (id, name, org_type, country, city, status, public_visible, audit_school) values
 ('11111111-0000-0000-0000-000000000007','Shiv Nadar School, Faridabad','school','India','Faridabad','active',true,true),
 ('11111111-0000-0000-0000-000000000008','Green School, Bali','school','Indonesia','Badung','active',true,true);
insert into auth.users (id,email) values ('aaaaaaaa-0000-0000-0000-00000000000f','auditor@sns.org'),('aaaaaaaa-0000-0000-0000-000000000010','liaison@sns.org');
insert into people (id, auth_user_id, display_name, email, age_band, is_minor) values
 ('22222222-0000-0000-0000-00000000000f','aaaaaaaa-0000-0000-0000-00000000000f','SNS Auditor','auditor@sns.org','18+',false),
 ('22222222-0000-0000-0000-000000000010','aaaaaaaa-0000-0000-0000-000000000010','SNS Liaison','liaison@sns.org','18+',false);
insert into role_assignments (person_id, org_id, role, local_title) values
 ('22222222-0000-0000-0000-00000000000f','11111111-0000-0000-0000-000000000007','auditor','Audit lead'),
 ('22222222-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000007','faculty_liaison',null);
insert into records (id, org_id, project_id, title, status, visibility, tier) values
 ('44444444-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','A draft under audit','in_review','network',2),
 ('44444444-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000007',null,'SNS own record','in_review','network',2);
select t('local title stored', (select local_title = 'Audit lead' from role_assignments where person_id='22222222-0000-0000-0000-00000000000f'));

set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
do $$ begin
  insert into verifications (record_id, requested_tier, requested_by_org, verifier_org) values ('44444444-0000-0000-0000-000000000002',3,'11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002');
  perform t('T3 from a non-audit school blocked', false);
exception when others then perform t('T3 from a non-audit school blocked', true); end $$;
do $$ begin
  insert into verifications (record_id, requested_tier, requested_by_org, verifier_org) values ('44444444-0000-0000-0000-000000000002',4,'11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000007');
  perform t('T4 from a school blocked', false);
exception when others then perform t('T4 from a school blocked', true); end $$;
do $$ begin
  insert into verifications (record_id, requested_tier, requested_by_org, verifier_org) values ('44444444-0000-0000-0000-000000000003',3,'11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000008');
  perform t('request for another school''s record blocked', false);
exception when others then perform t('request for another school''s record blocked', true); end $$;
insert into verifications (id, record_id, requested_tier, requested_by_org, verifier_org) values ('55555555-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002',3,'11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000007');
select t('T3 request to an audit school ok', true);
-- The audit school cannot audit itself
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000010',false);
do $$ begin
  insert into verifications (record_id, requested_tier, requested_by_org, verifier_org) values ('44444444-0000-0000-0000-000000000003',3,'11111111-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000007');
  perform t('self-audit blocked', false);
exception when others then perform t('self-audit blocked', true); end $$;
insert into verifications (record_id, requested_tier, requested_by_org, verifier_org) values ('44444444-0000-0000-0000-000000000003',3,'11111111-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000008');
select t('audit school can be audited by the other one', true);
-- The auditor reads what the audit covers, and nothing else
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000f',false);
select t('auditor reads record under audit', (select count(*) from records where id='44444444-0000-0000-0000-000000000002') = 1);
select t('auditor reads its measurements', (select count(*) from measurements where project_id='33333333-0000-0000-0000-000000000001') = 1);
select t('auditor cannot read other school projects', (select count(*) from projects where org_id='11111111-0000-0000-0000-000000000002') = 0);
select t('auditor sees no student people rows', (select count(*) from people where id='22222222-0000-0000-0000-00000000000b') = 0);
do $$ begin update measurements set tier = 3 where project_id='33333333-0000-0000-0000-000000000001'; 
  perform t('auditor cannot write measurements', (select count(*) from measurements where tier = 3) = 0);
exception when others then perform t('auditor cannot write measurements', true); end $$;
-- Only the audit school completes the audit
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
do $$ begin perform complete_verification('55555555-0000-0000-0000-000000000002', true, 'fine'); perform t('outsider audit blocked', false);
exception when others then perform t('outsider audit blocked', true); end $$;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000f',false);
select complete_verification('55555555-0000-0000-0000-000000000002', true, 'Baseline, raw numbers and evidence checked');
select t('audit access ends when the audit closes', (select count(*) from records where id='44444444-0000-0000-0000-000000000002') = 0);
do $$ begin perform complete_verification('55555555-0000-0000-0000-000000000002', true, 'again'); perform t('closed audit cannot be re-run', false);
exception when others then perform t('closed audit cannot be re-run', true); end $$;
reset role;
select t('auditor raised record to T3', (select tier = 3 from records where id='44444444-0000-0000-0000-000000000002'));

-- Budget lines follow the project
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into budget_lines (project_id, category, item, planned) values ('33333333-0000-0000-0000-000000000001','equipment','Compost drums',12000);
select t('student adds a budget line', (select count(*) from budget_lines) = 1);
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('other school cannot read budget lines', (select count(*) from budget_lines) = 0);
do $$ begin insert into budget_lines (project_id, category, item, planned) values ('33333333-0000-0000-0000-000000000001','other','x',1); perform t('other school cannot add budget lines', false);
exception when others then perform t('other school cannot add budget lines', true); end $$;
reset role;

-- Ranking counts only verified, named, public records plus adaptations by other schools
insert into records (id, org_id, project_id, title, status, visibility, anonymised, tier, outcome_class) values
 ('44444444-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000002','B bins worked','published','public',false,2,'worked'),
 ('44444444-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000002',null,'B unverified','published','network',false,1,'worked');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into adaptations (source_record_id, project_id, org_id) values ('44444444-0000-0000-0000-000000000004','33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002');
reset role;
select t('adapting school stamped from the project', (select org_id = '11111111-0000-0000-0000-000000000001' from adaptations limit 1));
set role anon; select set_config('request.jwt.claim.sub','',false);
select t('anon reads the ranking', (select count(*) from public_school_ranking) >= 1);
select t('ranking: 10 for a verified worked record + 8 for one adopting school', (select score = 18 from public_school_ranking where org_id='11111111-0000-0000-0000-000000000002'));
select t('ranking leaves out anonymised-only schools', (select count(*) from public_school_ranking where org_id='11111111-0000-0000-0000-000000000001') = 0);
reset role;

-- Direct function calls: visitors get only the guardian consent pair
set role anon; select set_config('request.jwt.claim.sub','',false);
do $$ begin perform public.is_steward(); perform t('anon cannot call role helpers', false);
exception when insufficient_privilege then perform t('anon cannot call role helpers', true); end $$;
do $$ begin perform public.complete_verification(gen_random_uuid(), true, 'x'); perform t('anon cannot call complete_verification', false);
exception when insufficient_privilege then perform t('anon cannot call complete_verification', true); end $$;
select t('anon still reads public organisations', (select count(*) from organisations where public_visible) >= 2);
select t('anon can look up a consent link', (select count(*) from consent_lookup('tok-c')) = 1);
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
do $$ begin perform public.guard_record(); perform t('nobody calls trigger functions directly', false);
exception when insufficient_privilege then perform t('nobody calls trigger functions directly', true); end $$;
reset role;

-- New people: consent cannot be preset, and earlier sign-ins are linked
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
insert into people (display_name, email, age_band, is_minor, consent_status) values ('Preset Minor','preset@x.org','13-15',true,'granted');
reset role;
select t('a minor cannot be created with consent already granted', (select consent_status = 'pending' from people where email='preset@x.org'));
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-0000000000ff','early.bird@x.org');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
insert into people (display_name, email, age_band, is_minor) values ('Early Bird','Early.Bird@x.org','18+',false);
reset role;
select t('someone who signed in before being invited is linked', (select auth_user_id = 'aaaaaaaa-0000-0000-0000-0000000000ff' from people where email='early.bird@x.org'));

-- Project stages follow signed gates
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
do $$ begin update projects set stage='measure' where id='33333333-0000-0000-0000-000000000001'; perform t('a project cannot skip stages', false);
exception when others then perform t('a project cannot skip stages', true); end $$;
update projects set stage='design' where id='33333333-0000-0000-0000-000000000001';
select t('a signed gate moves the project on', (select stage = 'design' from projects where id='33333333-0000-0000-0000-000000000001'));
do $$ begin update projects set stage='implement' where id='33333333-0000-0000-0000-000000000001'; perform t('no stage change without its gate', false);
exception when others then perform t('no stage change without its gate', true); end $$;
insert into projects (org_id, title, category, stage) values ('11111111-0000-0000-0000-000000000001','Sneaky','Waste','measure');
select t('new projects start at Identify', (select stage = 'identify' from projects where title='Sneaky'));
reset role;

-- The public views are read-only: they run with the owner's rights, so writes through them would skip row security
set role anon; select set_config('request.jwt.claim.sub','',false);
do $$ begin update public_records set title = 'changed' where true; perform t('visitors cannot change records through the public view', false);
exception when insufficient_privilege then perform t('visitors cannot change records through the public view', true); end $$;
do $$ begin delete from public_records where true; perform t('visitors cannot delete records through the public view', false);
exception when insufficient_privilege then perform t('visitors cannot delete records through the public view', true); end $$;
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
do $$ begin update public_records set title = 'changed' where true; perform t('members cannot change records through the public view', false);
exception when insufficient_privilege then perform t('members cannot change records through the public view', true); end $$;
reset role;

-- Roles: liaisons build their team, never network roles; adult roles need adults
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
do $$ begin insert into role_assignments (person_id, org_id, role) values ('22222222-0000-0000-0000-00000000000a','11111111-0000-0000-0000-000000000001','steward'); perform t('a liaison cannot make themselves a steward', false);
exception when others then perform t('a liaison cannot make themselves a steward', true); end $$;
do $$ begin update role_assignments set role = 'steward' where person_id = '22222222-0000-0000-0000-00000000000a'; perform t('a liaison cannot turn a role into steward', false);
exception when others then perform t('a liaison cannot turn a role into steward', true); end $$;
do $$ begin insert into role_assignments (person_id, org_id, role) values ('22222222-0000-0000-0000-00000000000b','11111111-0000-0000-0000-000000000001','faculty_liaison'); perform t('a student cannot be made faculty liaison', false);
exception when others then perform t('a student cannot be made faculty liaison', true); end $$;
do $$ begin insert into role_assignments (person_id, org_id, role) values ('22222222-0000-0000-0000-00000000000b','11111111-0000-0000-0000-000000000001','auditor'); perform t('auditors only at audit schools', false);
exception when others then perform t('auditors only at audit schools', true); end $$;
reset role;
select t('liaison is still not a steward', (select count(*) from role_assignments where person_id = '22222222-0000-0000-0000-00000000000a' and role = 'steward') = 0);

-- Consent status changes only through the guardian
insert into people (id, display_name, email, age_band, is_minor, consent_status) values ('22222222-0000-0000-0000-0000000000a1','Waiting Minor','waiting@x.org','13-15',true,'pending'),('22222222-0000-0000-0000-0000000000a2','Young Adult','young@x.org','18+',false,'not_needed');
insert into role_assignments (person_id, org_id, role) values ('22222222-0000-0000-0000-0000000000a1','11111111-0000-0000-0000-000000000001','implementation_team'),('22222222-0000-0000-0000-0000000000a2','11111111-0000-0000-0000-000000000001','implementation_team');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
do $$ begin update people set consent_status = 'not_needed' where id = '22222222-0000-0000-0000-0000000000a1'; perform t('a liaison cannot waive a minor''s consent', false);
exception when others then perform t('a liaison cannot waive a minor''s consent', true); end $$;
do $$ begin update people set age_band = '18+', is_minor = false, consent_status = 'not_needed' where id = '22222222-0000-0000-0000-0000000000a1'; perform t('a liaison cannot waive consent by changing the age band', false);
exception when others then perform t('a liaison cannot waive consent by changing the age band', true); end $$;
update people set age_band = '16-17', is_minor = true where id = '22222222-0000-0000-0000-0000000000a2';
reset role;
select t('recording someone as a minor puts them back to waiting for consent', (select consent_status = 'pending' from people where id = '22222222-0000-0000-0000-0000000000a2'));

-- School boundaries
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
do $$ begin update organisations set audit_school = true where id = '11111111-0000-0000-0000-000000000001'; perform t('a liaison cannot make their school an audit school', false);
exception when others then perform t('a liaison cannot make their school an audit school', true); end $$;
update organisations set city = 'Faridabad, Sector 21' where id = '11111111-0000-0000-0000-000000000001';
select t('a liaison can edit their school profile', (select city = 'Faridabad, Sector 21' from organisations where id = '11111111-0000-0000-0000-000000000001'));
do $$ begin insert into role_assignments (person_id, org_id, role) values ('22222222-0000-0000-0000-00000000000d','11111111-0000-0000-0000-000000000001','alumni'); perform t('a liaison cannot pull in another school''s student', false);
exception when others then perform t('a liaison cannot pull in another school''s student', true); end $$;
insert into role_assignments (person_id, org_id, role) values ('22222222-0000-0000-0000-00000000000b','11111111-0000-0000-0000-000000000001','ekoa_rep');
select t('a liaison can give their own student a second role', (select count(*) from role_assignments where person_id = '22222222-0000-0000-0000-00000000000b' and role = 'ekoa_rep') = 1);
insert into consent_records (person_id, guardian_email, scope, terms_version, token, granted_at) values ('22222222-0000-0000-0000-0000000000a1','g@x.org','{"account":true,"cross_school":true}','2026-10','guessable', now());
reset role;
select t('a new consent record starts ungranted with a database token', (select granted_at is null and token <> 'guessable' and scope ->> 'cross_school' = 'false' from consent_records where person_id = '22222222-0000-0000-0000-0000000000a1'));
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
do $$ begin insert into audit_log (actor_person_id, action, entity) values (null, 'fake system entry', 'x'); perform t('nobody writes anonymous audit entries', false);
exception when others then perform t('nobody writes anonymous audit entries', true); end $$;
reset role;

-- Moderation removes, never rewrites
insert into posts (id, thread_id, person_id, body) select '55555555-0000-0000-0000-000000000099', id, '22222222-0000-0000-0000-00000000000b', 'Original words' from threads limit 1;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
do $$ begin update posts set body = 'Words they never wrote' where id = '55555555-0000-0000-0000-000000000099'; perform t('moderators cannot rewrite a post', false);
exception when others then perform t('moderators cannot rewrite a post', true); end $$;
update posts set body = '[Removed by a moderator]' where id = '55555555-0000-0000-0000-000000000099';
reset role;
select t('moderators can remove a post''s text', (select body = '[Removed by a moderator]' from posts where id = '55555555-0000-0000-0000-000000000099'));

-- Un-anonymising a published record is the liaison's call
update records set status = 'published', visibility = 'public', anonymised = true, tier = 2 where id = '44444444-0000-0000-0000-000000000001';
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
do $$ begin update records set anonymised = false where id = '44444444-0000-0000-0000-000000000001'; perform t('a student cannot name the school on a published anonymised record', false);
exception when others then perform t('a student cannot name the school on a published anonymised record', true); end $$;
reset role;

-- ================================================================ October 27 feedback
-- Fixtures: a circle thread at School A, a steward who can sign in, a photo and policies.
insert into threads (id, kind, title, circle_id, org_id) select '77777777-0000-0000-0000-000000000001', 'circle', 'Compost tips', id, '11111111-0000-0000-0000-000000000001' from circles where theme = 'waste';
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-0000000000a5', 'founder.one@example.org');
insert into evidence (id, org_id, project_id, file_name, file_type, caption) values ('88888888-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','bins.jpg','image/jpeg','Bins behind the canteen');

-- Inappropriate posts are hidden the moment they are posted, and go to the author's teacher
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into posts (id, thread_id, body) values ('99999999-0000-0000-0000-000000000001','77777777-0000-0000-0000-000000000001','honestly you are so stupid');
insert into posts (id, thread_id, body) values ('99999999-0000-0000-0000-000000000002','77777777-0000-0000-0000-000000000001','Our bins work best with a lid. Weigh them on Thursdays.');
insert into posts (id, thread_id, body) values ('99999999-0000-0000-0000-000000000003','77777777-0000-0000-0000-000000000001','sometimes i want to die');
select t('a bullying post is hidden at once, even from its author', (select count(*) from posts where id = '99999999-0000-0000-0000-000000000001') = 0);
select t('an ordinary post stays up', (select count(*) from posts where id = '99999999-0000-0000-0000-000000000002') = 1);
do $$ begin insert into threads (kind, title, circle_id, org_id, created_by) select 'circle', 'you are all losers', id, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-00000000000b' from circles where theme = 'waste'; perform t('an abusive thread title is refused', false);
exception when others then perform t('an abusive thread title is refused', true); end $$;
reset role;
select t('the filter flagged the bullying post for School A', (select reason = 'bullying' and source = 'filter' and org_id = '11111111-0000-0000-0000-000000000001' from content_flags where target_id = '99999999-0000-0000-0000-000000000001'));
select t('a self-harm post also reaches the safeguarding lead', (select count(*) from safeguarding_reports where category = 'wellbeing' and details like '%at risk%') = 1);

-- Anyone can report: the post disappears at once, and only adults decide
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
insert into posts (id, thread_id, body) values ('99999999-0000-0000-0000-000000000004','77777777-0000-0000-0000-000000000001','Remember to log the weights before Friday.');
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into content_flags (target_kind, target_id, reason, source) values ('post','99999999-0000-0000-0000-000000000004','other','filter');
select t('a reported post is hidden from students immediately', (select count(*) from posts where id = '99999999-0000-0000-0000-000000000004') = 0);
select t('a student cannot file a flag as the filter', (select source = 'report' from content_flags where target_id = '99999999-0000-0000-0000-000000000004'));
update content_flags set status = 'restored' where target_id = '99999999-0000-0000-0000-000000000004';
reset role;
select t('a student cannot decide a flag', (select status = 'open' from content_flags where target_id = '99999999-0000-0000-0000-000000000004'));
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('another school''s student sees none of School A''s flags', (select count(*) from content_flags) = 0);
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select t('the liaison sees the flags for their school', (select count(*) from content_flags where org_id = '11111111-0000-0000-0000-000000000001') >= 3);
update content_flags set status = 'restored' where target_id = '99999999-0000-0000-0000-000000000004';
update content_flags set status = 'removed' where target_id = '99999999-0000-0000-0000-000000000001';
reset role;
select t('restoring brings the post back', (select not hidden from posts where id = '99999999-0000-0000-0000-000000000004'));
select t('removing replaces the text', (select body = '[Removed by a moderator]' from posts where id = '99999999-0000-0000-0000-000000000001'));

-- Photos: a report hides the photo from students, not from the teacher
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into content_flags (target_kind, target_id, reason) values ('evidence','88888888-0000-0000-0000-000000000001','sexual');
select t('a reported photo is hidden from students', (select count(*) from evidence where id = '88888888-0000-0000-0000-000000000001') = 0);
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select t('the liaison can still see the reported photo to review it', (select count(*) from evidence where id = '88888888-0000-0000-0000-000000000001') = 1);
reset role;

-- Helpful links on a policy
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into policy_links (policy_id, url, title, note) values ('66666666-0000-0000-0000-000000000001','https://docs.google.com/document/d/abc','Our compost rota','Who empties the bins each week');
insert into policy_links (policy_id, url, title) values ('66666666-0000-0000-0000-000000000001','https://example.org/x','send nudes');
select t('a student can add a link to their school''s policy', (select count(*) from policy_links where title = 'Our compost rota') = 1);
select t('an inappropriate link is hidden at once', (select count(*) from policy_links where title = 'send nudes') = 0);
do $$ begin insert into policy_links (policy_id, url, title) values ('66666666-0000-0000-0000-000000000001','javascript:alert(1)','Bad link'); perform t('only https links are accepted', false);
exception when others then perform t('only https links are accepted', true); end $$;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('other schools cannot see a school''s policy links', (select count(*) from policy_links) = 0);
do $$ begin insert into policy_links (policy_id, url, title) values ('66666666-0000-0000-0000-000000000001','https://example.org/y','Sneaky'); perform t('other schools cannot add links to a school''s policy', false);
exception when others then perform t('other schools cannot add links to a school''s policy', true); end $$;
reset role;

-- Collaborator schools from policy similarity
update organisations set status = 'active' where id in ('11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002');
update policies set sections = (select jsonb_agg(jsonb_build_object('key', section, 'title', title, 'body', body, 'clause_id', id)) from policy_clauses where section in ('documentation','measurement','reflection','continuity'))
  where id = '66666666-0000-0000-0000-000000000001';
insert into policies (org_id, title, sections) select '11111111-0000-0000-0000-000000000002', 'B policy', jsonb_agg(jsonb_build_object('key', section, 'title', title, 'body', body, 'clause_id', id)) from policy_clauses where section in ('documentation','measurement','reflection','workshops');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select t('a school sees schools with similar policies', (select count(*) from collaborator_suggestions('11111111-0000-0000-0000-000000000001') where org_id = '11111111-0000-0000-0000-000000000002') = 1);
select t('the shared clauses are named', (select cardinality(shared_clauses) >= 3 from collaborator_suggestions('11111111-0000-0000-0000-000000000001') where org_id = '11111111-0000-0000-0000-000000000002'));
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('the match works both ways', (select count(*) from collaborator_suggestions('11111111-0000-0000-0000-000000000002') where org_id = '11111111-0000-0000-0000-000000000001') = 1);
select t('nobody can ask on behalf of another school', (select count(*) from collaborator_suggestions('11111111-0000-0000-0000-000000000001')) = 0);
reset role;

-- Independent students
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-0000000000b1','indy.minor@x.org'), ('aaaaaaaa-0000-0000-0000-0000000000b2','indy.adult@x.org');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000b1',false);
do $$ begin perform register_independent_student('Indy Minor','16-17','Valley Public School','India','Delhi','',''); perform t('an under-18 needs a guardian email to join', false);
exception when others then perform t('an under-18 needs a guardian email to join', true); end $$;
select register_independent_student('Indy Minor','16-17','Valley Public School','India','Delhi','Guardian Minor','guardian.indy@x.org');
select t('an under-18 independent student waits for guardian consent', (select count(*) from projects) = 0 and (select public.active_person_id()) is null);
do $$ begin perform register_independent_student('Indy Again','18+','X','India','','',''); perform t('nobody registers twice', false);
exception when others then perform t('nobody registers twice', true); end $$;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000b2',false);
select register_independent_student('Indy Adult','18+','Hill School','India','Pune','','');
insert into projects (org_id, title, category) select org_id, 'My solo audit', 'Waste' from role_assignments where person_id = public.active_person_id();
select t('an independent student leads projects in their own workspace', (select count(*) from projects where title = 'My solo audit') = 1);
select t('an independent student sees no school''s people', (select count(*) from people) = 1);
do $$ begin perform assign_student('indy.adult@x.org','','', '11111111-0000-0000-0000-000000000001','project_lead','','','',true); perform t('only admins can assign roles', false);
exception when others then perform t('only admins can assign roles', true); end $$;
reset role;
select t('the minor''s consent link goes to the guardian, not the student', (select count(*) from consent_records c join people p on p.id = c.person_id where p.email = 'indy.minor@x.org' and c.guardian_email = 'guardian.indy@x.org' and c.granted_at is null) = 1);
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a5',false);
select assign_student('indy.adult@x.org','','', '11111111-0000-0000-0000-000000000001','implementation_team','Eco club','','',true);
do $$ begin perform assign_student('listed.kid@x.org','Listed Kid','13-15','11111111-0000-0000-0000-000000000001','implementation_team','','',''); perform t('a listed under-18 student needs a guardian email', false);
exception when others then perform t('a listed under-18 student needs a guardian email', true); end $$;
select assign_student('listed.kid@x.org','Listed Kid','13-15','11111111-0000-0000-0000-000000000001','implementation_team','','Guardian Kid','guardian.kid@x.org',false);
reset role;
select t('an admin moves an independent student and their project into the school', (select org_id = '11111111-0000-0000-0000-000000000001' from projects where title = 'My solo audit'));
select t('a listed student is created waiting for consent', (select consent_status = 'pending' from people where email = 'listed.kid@x.org'));

-- School registrations with student emails
set role anon; select set_config('request.jwt.claim.sub','',false);
insert into applications (name, email, organisation, student_emails) values ('Teacher T','t@school.org','New School', array['a@school.org','b@school.org']);
do $$ begin insert into applications (name, email, org_id) values ('X','x@y.z','11111111-0000-0000-0000-000000000001'); perform t('visitors cannot file for an existing school', false);
exception when others then perform t('visitors cannot file for an existing school', true); end $$;
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
insert into applications (name, email, kind, org_id, student_emails) values ('Liaison A','liaison.a@x.org','students','11111111-0000-0000-0000-000000000001', array['c@school.org']);
do $$ begin insert into applications (name, email, kind, org_id) values ('Liaison A','liaison.a@x.org','students','11111111-0000-0000-0000-000000000002'); perform t('a liaison sends student emails only for their own school', false);
exception when others then perform t('a liaison sends student emails only for their own school', true); end $$;
reset role;
select t('student email lists reach the admins', (select count(*) from applications where cardinality(student_emails) > 0) = 2);

-- Cross-school spaces need cross-school consent, even when your own school started them
insert into threads (id, kind, title, circle_id, org_id) select '77777777-0000-0000-0000-000000000002', 'circle', 'B circle thread', id, '11111111-0000-0000-0000-000000000002' from circles where theme = 'energy';
insert into threads (id, kind, title, org_id, org_b) values ('77777777-0000-0000-0000-000000000003', 'twin', 'A and B', '11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('a student without cross-school consent cannot read their school''s circle threads', (select count(*) from threads where id = '77777777-0000-0000-0000-000000000002') = 0);
select t('or a school-to-school conversation', (select count(*) from threads where id = '77777777-0000-0000-0000-000000000003') = 0);
do $$ begin insert into threads (kind, title, org_id, org_b, created_by) values ('twin', 'Hi A', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-00000000000d'); perform t('or start one', false);
exception when others then perform t('or start one', true); end $$;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
select t('a student with cross-school consent can join the conversation', (select count(*) from threads where id = '77777777-0000-0000-0000-000000000003') = 1);
reset role;

-- Public Policy library: adopted policies are public, drafts are not
set role anon; select set_config('request.jwt.claim.sub','',false);
select t('visitors see adopted policies in the library', (select count(*) from public_policies where id = '66666666-0000-0000-0000-000000000001') = 1);
select t('but never a draft', (select count(*) from public_policies where title = 'B policy') = 0);
do $$ begin perform t('visitors cannot read the policies table itself', (select count(*) from policies) = 0);
exception when others then perform t('visitors cannot read the policies table itself', true); end $$;
do $$ begin update public_policies set title = 'x'; perform t('the library cannot be written to', false);
exception when others then perform t('the library cannot be written to', true); end $$;
reset role;
