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
select t('pending minor sees no projects from another school', (select count(*) from projects where org_id = '11111111-0000-0000-0000-000000000002') = 0);
select t('pending minor sees no records, measurements or posts', (select count(*) from records) + (select count(*) from measurements) + (select count(*) from posts) = 0);
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

-- Individual student projects
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into projects (id, org_id, title, category, scope, lead_person_id, mentor_person_id) values ('33333333-0000-0000-0000-0000000000a1','11111111-0000-0000-0000-000000000001','Solo shampoo','Waste','individual','22222222-0000-0000-0000-00000000000b','22222222-0000-0000-0000-00000000000a');
select t('a student can start an individual project with a teacher mentor', (select count(*) from projects where id = '33333333-0000-0000-0000-0000000000a1') = 1);
do $$ begin insert into projects (org_id, title, category, scope, lead_person_id, mentor_person_id) values ('11111111-0000-0000-0000-000000000001','Solo, student mentor','Waste','individual','22222222-0000-0000-0000-00000000000b','22222222-0000-0000-0000-00000000000c'); perform t('a student cannot be the mentor', false);
exception when others then perform t('a student cannot be the mentor', true); end $$;
do $$ begin insert into projects (org_id, title, category, scope, lead_person_id, mentor_person_id) values ('11111111-0000-0000-0000-000000000001','Solo, someone else','Waste','individual','22222222-0000-0000-0000-00000000000c','22222222-0000-0000-0000-00000000000a'); perform t('a student cannot start a project in another student''s name', false);
exception when others then perform t('a student cannot start a project in another student''s name', true); end $$;
do $$ begin update projects set successor_person_id = '22222222-0000-0000-0000-00000000000d' where id = '33333333-0000-0000-0000-0000000000a1'; perform t('a successor from another school is refused', false);
exception when others then perform t('a successor from another school is refused', true); end $$;
update projects set successor_person_id = '22222222-0000-0000-0000-00000000000c' where id = '33333333-0000-0000-0000-0000000000a1';
select t('a student can name a future student from their school to continue', (select successor_person_id is not null from projects where id = '33333333-0000-0000-0000-0000000000a1'));
do $$ begin update projects set mentor_person_id = '22222222-0000-0000-0000-00000000000b' where id = '33333333-0000-0000-0000-0000000000a1'; perform t('a student cannot change the mentor', false);
exception when others then perform t('a student cannot change the mentor', true); end $$;
reset role;

-- Project chat: school-only
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into threads (kind, org_id, project_id, title) values ('project','11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','Team chat');
select t('a student starts a team chat for their school project', (select count(*) from threads where kind='project' and project_id='33333333-0000-0000-0000-000000000001') = 1);
do $$ begin insert into threads (kind, org_id, project_id, title) values ('project','11111111-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000001','Wrong school'); perform t('a project chat cannot be filed under another school', false);
exception when others then perform t('a project chat cannot be filed under another school', true); end $$;
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('another school cannot read a project chat', (select count(*) from threads where kind='project') = 0);
do $$ begin insert into threads (kind, org_id, project_id, title) values ('project','11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','Intruder'); perform t('another school cannot start a chat in this project', false);
exception when others then perform t('another school cannot start a chat in this project', true); end $$;
reset role;

-- Project files: school-only
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into project_files (org_id, project_id, title, file_name, file_type, size_bytes, storage_path) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','Baseline notes','notes.pdf','application/pdf',1000,'11111111-0000-0000-0000-000000000001/p/notes.pdf');
insert into project_files (org_id, project_id, title, link_url) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','Slides','https://docs.google.com/presentation/d/abc');
select t('a student adds a file and a link to their project', (select count(*) from project_files) = 2);
select t('the file records who added it', (select count(*) from project_files where added_by = '22222222-0000-0000-0000-00000000000b') = 2);
do $$ begin insert into project_files (org_id, project_id, title, link_url) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','Bad','http://insecure.example'); perform t('only secure links are accepted', false);
exception when others then perform t('only secure links are accepted', true); end $$;
do $$ begin insert into project_files (org_id, project_id, title, file_name, storage_path) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','Wrong folder','x.pdf','11111111-0000-0000-0000-000000000002/x.pdf'); perform t('a file cannot be stored in another school''s folder', false);
exception when others then perform t('a file cannot be stored in another school''s folder', true); end $$;
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('another school cannot read project files', (select count(*) from project_files) = 0);
do $$ begin insert into project_files (org_id, project_id, title, link_url) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','Intruder','https://example.org/x'); perform t('another school cannot add files to this project', false);
exception when others then perform t('another school cannot add files to this project', true); end $$;
reset role;

-- Choosing the verifying teacher later
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
insert into projects (id, org_id, title, category, scope, lead_person_id, mentor_person_id) values ('33333333-0000-0000-0000-0000000000a2','11111111-0000-0000-0000-000000000001','No teacher yet','Waste','individual','22222222-0000-0000-0000-00000000000b',null);
select t('a student can start an individual project before choosing a teacher', (select count(*) from projects where id = '33333333-0000-0000-0000-0000000000a2') = 1);
update projects set problem = 'Bins are mixed' where id = '33333333-0000-0000-0000-0000000000a2';
select t('the project can be edited while no teacher is chosen', (select problem = 'Bins are mixed' from projects where id = '33333333-0000-0000-0000-0000000000a2'));
do $$ begin update projects set stage = 'design' where id = '33333333-0000-0000-0000-0000000000a2'; perform t('a project cannot move on without a teacher', false);
exception when others then perform t('a project cannot move on without a teacher', true); end $$;
update projects set mentor_person_id = '22222222-0000-0000-0000-00000000000a' where id = '33333333-0000-0000-0000-0000000000a2';
select t('the student lead can choose the teacher later', (select mentor_person_id is not null from projects where id = '33333333-0000-0000-0000-0000000000a2'));
do $$ begin update projects set mentor_person_id = '22222222-0000-0000-0000-00000000000b' where id = '33333333-0000-0000-0000-0000000000a2'; perform t('a student cannot swap the teacher once chosen', false);
exception when others then perform t('a student cannot swap the teacher once chosen', true); end $$;
reset role;

-- Clause offers: teacher offers, steward accepts
insert into auth.users (id,email) values ('aaaaaaaa-0000-0000-0000-0000000000e1','steward.test@x.org');
insert into people (id, auth_user_id, display_name, email, age_band, is_minor, consent_status) values ('22222222-0000-0000-0000-0000000000e1','aaaaaaaa-0000-0000-0000-0000000000e1','Steward Test','steward.test@x.org','18+',false,'not_needed');
insert into organisations (id, name, org_type, country, city, status, public_visible) values ('11111111-0000-0000-0000-0000000000e1','Ekoa Test Stewards','ekoa','India','Delhi','active',false) on conflict do nothing;
insert into role_assignments (person_id, org_id, role) values ('22222222-0000-0000-0000-0000000000e1','11111111-0000-0000-0000-0000000000e1','steward');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
insert into clause_offers (id, org_id, section, title, body) values ('55555555-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Waste','Weigh before you plan','Every project starts with five school days of weighed baseline data before any change is made.');
select t('a teacher can offer a clause to the library', (select count(*) from clause_offers) = 1);
select t('an offer starts pending and records the teacher', (select status = 'pending' and offered_by = '22222222-0000-0000-0000-00000000000a' from clause_offers limit 1));
do $$ begin perform public.accept_clause_offer('55555555-0000-0000-0000-000000000001'); perform t('a teacher cannot accept their own offer', false);
exception when others then perform t('a teacher cannot accept their own offer', true); end $$;
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
do $$ begin insert into clause_offers (org_id, section, title, body) values ('11111111-0000-0000-0000-000000000001','Waste','Student offer','A student should not be able to offer clauses to the library.'); perform t('a student cannot offer a clause', false);
exception when others then perform t('a student cannot offer a clause', true); end $$;
select t('a student cannot read clause offers', (select count(*) from clause_offers) = 0);
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('another school cannot read clause offers', (select count(*) from clause_offers) = 0);
reset role; set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000e1',false);
select public.accept_clause_offer('55555555-0000-0000-0000-000000000001');
select t('a steward accepts an offer into the shared library', (select count(*) from policy_clauses where title = 'Weigh before you plan' and source_org_id = '11111111-0000-0000-0000-000000000001') = 1);
select t('the offer is marked accepted', (select status = 'accepted' from clause_offers limit 1));
reset role;

-- ================================================================ Drafts before consent
-- Student C (13-15) is a member of School A and is made pending again, as a new sign-up would be.
update people set consent_status = 'pending', created_at = now(), draft_until = null where id = '22222222-0000-0000-0000-00000000000c';
update consent_records set granted_at = null, scope = '{"account":false,"cross_school":false,"photos":false,"name_on_records":false}' where person_id = '22222222-0000-0000-0000-00000000000c';

insert into circles (id, name, theme) values ('66666666-0000-0000-0000-0000000000c1','Draft test circle','draft-test-circle');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000c',false);
select t('pending: sees their own school''s projects', (select count(*) from projects where org_id = '11111111-0000-0000-0000-000000000001') >= 1);
select t('pending: sees no project from another school', (select count(*) from projects where org_id = '11111111-0000-0000-0000-000000000002') = 0);
select t('pending: cannot see other people''s names', (select count(*) from people where id <> '22222222-0000-0000-0000-00000000000c') = 0);
select t('pending: reads their own school''s name', (select count(*) from organisations where id = '11111111-0000-0000-0000-000000000001') = 1);

insert into projects (id, org_id, title, category, scope, lead_person_id, mentor_person_id) values ('33333333-0000-0000-0000-0000000000c1','11111111-0000-0000-0000-000000000001','C solo draft','Waste','individual','22222222-0000-0000-0000-00000000000c',null);
select t('pending: can start their own individual project with no teacher', (select count(*) from projects where id = '33333333-0000-0000-0000-0000000000c1') = 1);
do $$ begin insert into projects (org_id, title, category, scope, lead_person_id, mentor_person_id) values ('11111111-0000-0000-0000-000000000001','As someone else','Waste','individual','22222222-0000-0000-0000-00000000000b',null); perform t('pending: cannot start a project as another student', false);
exception when others then perform t('pending: cannot start a project as another student', true); end $$;
insert into projects (id, org_id, title, category) values ('33333333-0000-0000-0000-0000000000c2','11111111-0000-0000-0000-000000000001','C team draft','Energy');
select t('pending: can draft a school team project', (select count(*) from projects where id = '33333333-0000-0000-0000-0000000000c2') = 1);
do $$ begin insert into projects (org_id, title, category) values ('11111111-0000-0000-0000-000000000002','Wrong school','Energy'); perform t('pending: cannot draft in another school', false);
exception when others then perform t('pending: cannot draft in another school', true); end $$;
insert into tasks (project_id, title, owner_role) values ('33333333-0000-0000-0000-0000000000c1','Count the bins','implementation_team');
update projects set problem = 'Bins are mixed' where id = '33333333-0000-0000-0000-0000000000c1';
select t('pending: can add tasks and edit their draft', (select count(*) from tasks where project_id = '33333333-0000-0000-0000-0000000000c1') = 1 and (select problem from projects where id = '33333333-0000-0000-0000-0000000000c1') = 'Bins are mixed');
do $$ begin insert into tasks (project_id, title, owner_role) values ('33333333-0000-0000-0000-000000000002','Intrude','implementation_team'); perform t('pending: cannot add tasks to another school', false);
exception when others then perform t('pending: cannot add tasks to another school', true); end $$;

-- Everything that leaves the school or counts toward the network stays locked
do $$ begin insert into evidence (org_id, file_name, file_type) values ('11111111-0000-0000-0000-000000000001','a.jpg','image/jpeg'); perform t('pending: cannot upload evidence', false);
exception when others then perform t('pending: cannot upload evidence', true); end $$;
do $$ begin insert into records (org_id, title, status, visibility, tier) values ('11111111-0000-0000-0000-000000000001','x','published','network',2); perform t('pending: cannot publish a record', false);
exception when others then perform t('pending: cannot publish a record', true); end $$;
do $$ begin insert into measurements (project_id, metric_code, value, period_start, period_end, entered_role, tier) values ('33333333-0000-0000-0000-0000000000c1','diversion_rate',40,current_date-6,current_date,'project_lead',0); perform t('pending: cannot log measurements', false);
exception when others then perform t('pending: cannot log measurements', true); end $$;
do $$ begin insert into stage_gates (project_id, stage) values ('33333333-0000-0000-0000-0000000000c1','identify'); perform t('pending: cannot sign a stage gate', false);
exception when others then perform t('pending: cannot sign a stage gate', true); end $$;
do $$ begin update projects set stage = 'design' where id = '33333333-0000-0000-0000-0000000000c1'; perform t('pending: cannot move a project past Identify', false);
exception when others then perform t('pending: cannot move a project past Identify', true); end $$;
do $$ begin insert into project_files (org_id, project_id, title, link_url) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-0000000000c1','Doc','https://example.org/x'); perform t('pending: cannot add project files', false);
exception when others then perform t('pending: cannot add project files', true); end $$;
do $$ begin insert into threads (kind, org_id, title) values ('twin','11111111-0000-0000-0000-000000000001','Hello'); perform t('pending: cannot start a thread', false);
exception when others then perform t('pending: cannot start a thread', true); end $$;
do $$ begin insert into circle_members (circle_id, person_id) values ('66666666-0000-0000-0000-0000000000c1', '22222222-0000-0000-0000-00000000000c'); perform t('pending: cannot join a circle', false);
exception when others then perform t('pending: cannot join a circle', true); end $$;

-- Comments
insert into project_comments (org_id, project_id, body) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-0000000000c1','Here is what I plan to do next.');
select t('pending: can comment on their own draft, named by the database', (select author_name = 'Pending Minor' and person_id = '22222222-0000-0000-0000-00000000000c' from project_comments limit 1));
do $$ begin insert into project_comments (org_id, project_id, body) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-0000000000c1','Call me on +91 98765 43210'); perform t('comments refuse phone numbers', false);
exception when others then perform t('comments refuse phone numbers', true); end $$;
do $$ begin insert into project_comments (org_id, project_id, body) values ('11111111-0000-0000-0000-000000000002','33333333-0000-0000-0000-0000000000c1','Wrong school'); perform t('comments cannot name the wrong school', false);
exception when others then perform t('comments cannot name the wrong school', true); end $$;
reset role;

-- Teachers see pending drafts and comment on them
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select t('teacher sees a pending student''s draft', (select count(*) from projects where id = '33333333-0000-0000-0000-0000000000c1') = 1);
insert into project_comments (org_id, project_id, body) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-0000000000c1','Good start. Which bins will you count first?');
select t('teacher comment is stamped with their name and role', (select author_name = 'Liaison A' and author_role = 'Faculty Liaison' from project_comments where person_id = '22222222-0000-0000-0000-00000000000a'));
reset role;

set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000c',false);
select t('pending: reads the teacher''s comment', (select count(*) from project_comments) = 2);
reset role;

-- Another school sees none of it
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('another school cannot read draft projects or comments', (select count(*) from projects where id in ('33333333-0000-0000-0000-0000000000c1','33333333-0000-0000-0000-0000000000c2')) + (select count(*) from project_comments) = 0);
do $$ begin insert into project_comments (org_id, project_id, body) values ('11111111-0000-0000-0000-000000000001','33333333-0000-0000-0000-0000000000c1','Intruder'); perform t('another school cannot comment on a draft', false);
exception when others then perform t('another school cannot comment on a draft', true); end $$;
do $$ begin perform extend_draft_access('22222222-0000-0000-0000-00000000000c', 30); perform t('another school cannot extend draft time', false);
exception when others then perform t('another school cannot extend draft time', true); end $$;
reset role;

-- Drafts never reach the public views or the ranking
set role anon; select set_config('request.jwt.claim.sub','',false);
select t('drafts add nothing to public records', (select count(*) from public_records where title in ('C solo draft','C team draft')) = 0 and (select count(*) from public_records) = 2);
reset role;

-- Suspension after 30 days, and bringing the account back
update people set created_at = now() - interval '31 days' where id = '22222222-0000-0000-0000-00000000000c';
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000c',false);
select t('suspended: sees no projects after 30 days without consent', (select count(*) from projects) = 0);
do $$ begin insert into tasks (project_id, title, owner_role) values ('33333333-0000-0000-0000-0000000000c1','Late','implementation_team'); perform t('suspended: cannot write', false);
exception when others then perform t('suspended: cannot write', true); end $$;
do $$ begin perform extend_draft_access('22222222-0000-0000-0000-00000000000c', 30); perform t('a student cannot extend their own draft time', false);
exception when others then perform t('a student cannot extend their own draft time', true); end $$;
reset role;
select t('suspended: work is kept, not deleted', (select count(*) from projects where id = '33333333-0000-0000-0000-0000000000c1') = 1);
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select extend_draft_access('22222222-0000-0000-0000-00000000000c', 30);
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000c',false);
select t('a teacher extending draft time brings the account back', (select count(*) from projects where id = '33333333-0000-0000-0000-0000000000c1') = 1);
reset role;

-- Withdrawn consent is never a working identity
update people set consent_status = 'withdrawn' where id = '22222222-0000-0000-0000-00000000000c';
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000c',false);
select t('withdrawn: sees no projects', (select count(*) from projects) = 0);
reset role;
update people set consent_status = 'pending' where id = '22222222-0000-0000-0000-00000000000c';

-- A guardian approves: full access, and the draft is still there
select grant_consent('tok-c', 'Guardian Name', '{"account":true,"cross_school":false,"photos":false,"name_on_records":false}');
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000c',false);
select t('after approval: the draft is still there', (select count(*) from projects where id = '33333333-0000-0000-0000-0000000000c1') = 1);
insert into evidence (org_id, file_name, file_type) values ('11111111-0000-0000-0000-000000000001','a.jpg','image/jpeg');
select t('after approval: evidence upload now works', (select count(*) from evidence) >= 1);
reset role;

-- ================================================================ Direct signup and join requests
insert into auth.users (id,email) values
 ('aaaaaaaa-0000-0000-0000-0000000000a1','nia.student@x.org'),('aaaaaaaa-0000-0000-0000-0000000000a2','omar.student@x.org'),
 ('aaaaaaaa-0000-0000-0000-0000000000a3','head.new@x.org'),('aaaaaaaa-0000-0000-0000-0000000000a4','adult.student@x.org');

-- A student signs up directly
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a1',false);
select signup_student('Nia Student', '13-15');
do $$ begin perform signup_student('Nia Again', '13-15'); perform t('signup: a second signup is refused', false);
exception when others then perform t('signup: a second signup is refused', true); end $$;
reset role;
select t('signup: student starts pending with a consent link ready', (select p.consent_status = 'pending' and p.is_minor and exists (select 1 from consent_records c where c.person_id = p.id and length(c.token) > 10) from people p where p.email = 'nia.student@x.org'));
select t('signup: student gets a private workspace', (select o.org_type = 'workspace' and not o.public_visible from role_assignments r join organisations o on o.id = r.org_id join people p on p.id = r.person_id where p.email = 'nia.student@x.org'));
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a2',false);
do $$ begin perform signup_student('Bad Age', '9'); perform t('signup: an invalid age group is refused', false);
exception when others then perform t('signup: an invalid age group is refused', true); end $$;
select signup_student('Omar Student', '16-17');
reset role;
set role anon; select set_config('request.jwt.claim.sub','',false);
do $$ begin perform signup_student('Anon', '13-15'); perform t('signup: visitors who are not signed in cannot sign up', false);
exception when others then perform t('signup: visitors who are not signed in cannot sign up', true); end $$;
select t('signup: workspaces are invisible to visitors', (select count(*) from organisations where org_type = 'workspace') = 0);
reset role;

-- Nia works in her workspace, finds a school, asks to join
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a1',false);
insert into projects (id, org_id, title, category) values ('33333333-0000-0000-0000-0000000000f1', (select org_id from role_assignments limit 1), 'Nia compost', 'Food');
select t('signup: the new student can draft in their workspace straight away', (select count(*) from projects) = 1);
select t('find: a verified public school can be found by name', (select count(*) from find_schools('school a')) = 1);
select t('find: the search needs at least two letters', (select count(*) from find_schools('s')) = 0);
select request_to_join_school('11111111-0000-0000-0000-000000000001');
do $$ begin perform request_to_join_school('11111111-0000-0000-0000-000000000002'); perform t('join: only one request at a time', false);
exception when others then perform t('join: only one request at a time', true); end $$;
select t('join: the student sees their own request', (select count(*) from join_requests where status = 'requested') = 1);
select t('join: not a member yet, so the school''s drafts stay hidden', (select count(*) from projects where org_id = '11111111-0000-0000-0000-000000000001') = 0);
reset role;

-- Only a teacher at that school sees and decides
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
select t('join: a student cannot see the requests', (select count(*) from pending_join_requests('11111111-0000-0000-0000-000000000001')) = 0);
do $$ begin perform decide_join_request((select id from join_requests limit 1), true); perform t('join: a student cannot confirm', false);
exception when others then perform t('join: a student cannot confirm', true); end $$;
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000d',false);
select t('join: another school''s member cannot see the requests', (select count(*) from pending_join_requests('11111111-0000-0000-0000-000000000001')) = 0);
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select t('join: the school''s teacher sees the request', (select count(*) from pending_join_requests('11111111-0000-0000-0000-000000000001') where display_name = 'Nia Student') = 1);
select t('join: confirming moves the draft project into the school', (select decide_join_request((select id from join_requests where status = 'requested' limit 1), true)) = 1);
reset role;
select t('join: the student now holds a team seat', (select count(*) from role_assignments r join people p on p.id = r.person_id where p.email = 'nia.student@x.org' and r.org_id = '11111111-0000-0000-0000-000000000001' and r.role = 'implementation_team') = 1);
select t('join: the empty workspace is gone', (select count(*) from role_assignments r join organisations o on o.id = r.org_id join people p on p.id = r.person_id where p.email = 'nia.student@x.org' and o.org_type = 'workspace') = 0);
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a1',false);
select t('join: the student sees the school''s projects, including their own', (select count(*) from projects where id = '33333333-0000-0000-0000-0000000000f1') = 1);
select t('join: still no view of the other school', (select count(*) from projects where org_id = '11111111-0000-0000-0000-000000000002') = 0);
do $$ begin perform request_to_join_school('11111111-0000-0000-0000-000000000002'); perform t('join: a member of a school cannot join a second one', false);
exception when others then perform t('join: a member of a school cannot join a second one', true); end $$;
reset role;

-- Declined
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a2',false);
select request_to_join_school('11111111-0000-0000-0000-000000000001');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select decide_join_request((select id from join_requests where status = 'requested' limit 1), false);
reset role;
select t('declined: no seat is given', (select count(*) from role_assignments r join people p on p.id = r.person_id where p.email = 'omar.student@x.org' and r.org_id = '11111111-0000-0000-0000-000000000001') = 0);

-- A school registers itself
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a3',false);
select signup_school('Head New', 'Unverified Academy', 'Kenya', 'Nairobi');
reset role;
select t('school signup: unverified and private', (select status = 'onboarding' and not public_visible and length(join_code) = 10 from organisations where name = 'Unverified Academy'));
select t('school signup: the registrant is its teacher (faculty liaison)', (select count(*) from role_assignments r join people p on p.id = r.person_id join organisations o on o.id = r.org_id where p.email = 'head.new@x.org' and o.name = 'Unverified Academy' and r.role = 'faculty_liaison') = 1);
select id as unv from organisations where name = 'Unverified Academy' \gset
select join_code as unvcode from organisations where name = 'Unverified Academy' \gset
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a2',false);
select t('school signup: an unverified school is not in the name search', (select count(*) from find_schools('Unverified')) = 0);
select set_config('t.unv', :'unv', false);
do $$ begin perform request_to_join_school(current_setting('t.unv')::uuid, null); perform t('school signup: an unverified school needs its join code', false);
exception when others then perform t('school signup: an unverified school needs its join code', true); end $$;
select t('school signup: the join code finds the school', (select count(*) from school_by_code(:'unvcode')) = 1);
select request_to_join_school(:'unv'::uuid, :'unvcode');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select t('school signup: another school''s teacher cannot see its requests', (select count(*) from pending_join_requests(:'unv'::uuid)) = 0);
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a3',false);
select t('school signup: its own teacher sees the request', (select count(*) from pending_join_requests(:'unv'::uuid)) = 1);
reset role;

-- A project with attachments stays put
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a4',false);
select signup_student('Adult Learner', '18+');
insert into projects (id, org_id, title, category) values ('33333333-0000-0000-0000-0000000000f2', (select org_id from role_assignments limit 1), 'Adult project', 'Water');
insert into evidence (org_id, project_id, file_name, file_type) values ((select org_id from role_assignments limit 1), '33333333-0000-0000-0000-0000000000f2', 'tap.jpg', 'image/jpeg');
select request_to_join_school('11111111-0000-0000-0000-000000000001');
reset role;
select t('adult sign-up needs no guardian consent', (select consent_status = 'not_needed' from people where email = 'adult.student@x.org'));
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
select t('join: a project with evidence is left in the workspace', (select decide_join_request((select id from join_requests where status = 'requested' limit 1), true)) = 0);
reset role;
select t('join: that workspace is kept', (select count(*) from projects pr join organisations o on o.id = pr.org_id where pr.id = '33333333-0000-0000-0000-0000000000f2' and o.org_type = 'workspace') = 1);

-- ================================================================ Unverified schools score less
insert into organisations (id, name, org_type, country, city, status, public_visible) values
 ('11111111-0000-0000-0000-0000000000f1','Half School','school','Kenya','Nairobi','onboarding',true),
 ('11111111-0000-0000-0000-0000000000f2','Full School','school','Kenya','Mombasa','active',true);
insert into records (id, org_id, title, status, visibility, anonymised, tier, outcome_class) values
 ('44444444-0000-0000-0000-0000000000f1','11111111-0000-0000-0000-0000000000f1','Half record','published','public',false,2,'worked'),
 ('44444444-0000-0000-0000-0000000000f2','11111111-0000-0000-0000-0000000000f2','Full record','published','public',false,2,'worked');
select t('ranking: a verified school scores full points', (select score = 10 from public_school_ranking where org_id = '11111111-0000-0000-0000-0000000000f2'));
select t('ranking: an unverified school scores half', (select score = 5 from public_school_ranking where org_id = '11111111-0000-0000-0000-0000000000f1'));
insert into projects (id, org_id, title, category) values ('33333333-0000-0000-0000-0000000000f9','11111111-0000-0000-0000-0000000000f1','Half project','Waste');
insert into adaptations (source_record_id, project_id, org_id) values ('44444444-0000-0000-0000-0000000000f2','33333333-0000-0000-0000-0000000000f9','11111111-0000-0000-0000-0000000000f1');
select t('ranking: an unverified school''s adaptation awards no points', (select adopting_schools = 0 and score = 10 from public_school_ranking where org_id = '11111111-0000-0000-0000-0000000000f2'));
insert into adaptations (source_record_id, project_id, org_id) values ('44444444-0000-0000-0000-0000000000f2','33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001');
select t('ranking: a verified school''s adaptation still awards points', (select adopting_schools = 1 and score = 18 from public_school_ranking where org_id = '11111111-0000-0000-0000-0000000000f2'));

-- A school's own teacher cannot make it public
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-0000000000a3',false);
do $$ begin update organisations set public_visible = true where name = 'Unverified Academy'; perform t('a teacher cannot make their own school public', false);
exception when others then perform t('a teacher cannot make their own school public', true); end $$;
do $$ begin update organisations set join_code = 'MINE1234' where name = 'Unverified Academy'; perform t('a teacher cannot rewrite the join code', false);
exception when others then perform t('a teacher cannot rewrite the join code', true); end $$;
update organisations set city = 'Kisumu' where name = 'Unverified Academy';
select t('a teacher can still edit their school profile', (select city = 'Kisumu' from organisations where name = 'Unverified Academy'));
reset role;

-- ================================================================ Unverified public records
insert into organisations (id, name, org_type, country, city, status, public_visible) values ('11111111-0000-0000-0000-0000000000f3','Cap School','school','Kenya','Kisumu','active',true);
insert into records (org_id, title, status, visibility, anonymised, tier, outcome_class, published_at)
 select '11111111-0000-0000-0000-0000000000f3', 'Unverified ' || g, 'published', 'public', false, 1, 'worked', now() - make_interval(mins => g) from generate_series(1, 8) g;
select t('unverified: each T1 record scores 5 (half of 10), capped at five records', (select score = 25 and verified_records = 0 from public_school_ranking where org_id = '11111111-0000-0000-0000-0000000000f3'));
insert into records (org_id, title, status, visibility, anonymised, tier, outcome_class, published_at) values ('11111111-0000-0000-0000-0000000000f3','Verified one','published','public',false,2,'worked', now());
select t('unverified: a verified record still scores full and counts as verified', (select score = 35 and verified_records = 1 from public_school_ranking where org_id = '11111111-0000-0000-0000-0000000000f3'));
select t('unverified: they appear in the public library, labelled by tier', (select count(*) from public_records where title like 'Unverified %' and tier = 1) = 8);

-- A school's teacher can publish a T1 record publicly, and a student still cannot
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000a',false);
insert into records (org_id, title, status, visibility, tier) values ('11111111-0000-0000-0000-000000000001','Teacher unverified','published','public',1);
select t('unverified: the teacher can publish a T1 record publicly', (select count(*) from records where title = 'Teacher unverified') = 1);
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-00000000000b',false);
do $$ begin insert into records (org_id, title, status, visibility, tier) values ('11111111-0000-0000-0000-000000000001','Student tries','published','public',1); perform t('unverified: a student still cannot publish', false);
exception when others then perform t('unverified: a student still cannot publish', true); end $$;
reset role;
-- Adapting an unverified record awards nothing
insert into adaptations (source_record_id, project_id) select id, '33333333-0000-0000-0000-000000000001' from records where title = 'Unverified 1';
select t('unverified: adapting an unverified record awards no points', (select adopting_schools = 0 from public_school_ranking where org_id = '11111111-0000-0000-0000-0000000000f3'));
