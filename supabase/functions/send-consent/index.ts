// Emails a guardian the consent link for a newly invited student.
// Only the faculty liaison of the student's school (or a steward) can trigger it.
// Secrets: RESEND_API_KEY, SITE_URL, optional EMAIL_FROM. Uses the service role key provided by Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { cors, json, sendEmail } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization') ?? '';
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { person_id } = await req.json().catch(() => ({}));
  if (!person_id) return json({ error: 'person_id required' }, 400);

  // Reading the consent record as the caller proves they are the liaison (row-level security).
  const { data: rec } = await asUser.from('consent_records').select('token, guardian_email, guardian_name, person_id').eq('person_id', person_id).is('granted_at', null).maybeSingle();
  if (!rec) return json({ error: 'Not allowed or nothing to send.' }, 403);

  const { data: person } = await admin.from('people').select('display_name').eq('id', person_id).single();
  const { data: role } = await admin.from('role_assignments').select('org_id').eq('person_id', person_id).limit(1).single();
  const { data: org } = await admin.from('organisations').select('name').eq('id', role?.org_id).single();
  const first = (person?.display_name ?? 'your child').split(' ')[0];
  const link = `${Deno.env.get('SITE_URL') ?? ''}/consent/${rec.token}`;
  const text = [
    `Dear ${rec.guardian_name || 'parent or guardian'},`,
    ``,
    `${org?.name ?? 'Your child’s school'} has invited ${first} to take part in Ekoa, a student sustainability network.`,
    `${first}'s account stays switched off until you decide. You choose exactly what you allow, and you can change it at any time:`,
    ``,
    link,
    ``,
    `Adults never message students one-to-one on the platform, and contact details posted in shared spaces are blocked automatically.`,
    `If you did not expect this email, you can ignore it or reply to the school.`,
  ].join('\n');
  const sent = await sendEmail(rec.guardian_email, `Consent for ${first} to join Ekoa`, text);
  return json({ sent });
});
