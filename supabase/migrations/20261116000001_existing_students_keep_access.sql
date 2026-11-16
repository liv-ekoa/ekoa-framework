-- Ekoa: students who signed up before direct sign-up keep working without waiting for a guardian.
--
-- Guardian consent itself is NOT changed. The database only lets a guardian's link set a student to
-- 'granted', and nothing here fakes that. Instead every minor whose consent is still pending gets
-- 90 days of draft access (the most a teacher can give), counted from the day this runs, so they
-- can sign in and start work at once and are never suspended while their guardian catches up.
-- Everything that needs consent (publishing, evidence, posts, ranking points) stays locked until
-- the guardian approves. Withdrawn consent is never touched. Safe to run more than once.

update public.people
set draft_until = greatest(coalesce(draft_until, now()), now() + interval '90 days')
where is_minor
  and consent_status = 'pending'
  and (draft_until is null or draft_until < now() + interval '90 days');
