// Emails the stewards when someone applies through /join, so no application sits unseen.
// Secrets: RESEND_API_KEY, STEWARD_EMAIL (comma-separated), optional EMAIL_FROM, SITE_URL.
import { cors, json, sendEmail } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const a = await req.json().catch(() => null);
  if (!a || typeof a.email !== 'string' || typeof a.name !== 'string') return json({ error: 'Bad request' }, 400);
  const to = (Deno.env.get('STEWARD_EMAIL') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!to.length) return json({ sent: false });
  const site = Deno.env.get('SITE_URL') ?? '';
  const text = [
    `New founding-cohort application`,
    ``,
    `Name: ${String(a.name).slice(0, 200)}`,
    `Email: ${String(a.email).slice(0, 200)}`,
    `Organisation: ${String(a.organisation ?? '').slice(0, 200)}`,
    `Country: ${String(a.country ?? '').slice(0, 100)}`,
    `Role: ${String(a.role ?? '').slice(0, 100)}`,
    ``,
    String(a.message ?? '').slice(0, 3000),
    ``,
    `Review it in the steward console: ${site}/app/steward?tab=applications`,
  ].join('\n');
  const sent = await sendEmail(to.join(','), `New application: ${String(a.organisation || a.name).slice(0, 80)}`, text);
  return json({ sent });
});
