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
