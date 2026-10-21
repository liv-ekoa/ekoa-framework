// Drafts the prose parts of an Implementation Record from project facts.
// Only project facts are sent: no names, emails or student details ever reach the model.
// Secrets: ANTHROPIC_API_KEY. Optional: ANTHROPIC_MODEL (check the current model list in the Anthropic docs).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { cors, json } from '../_shared/cors.ts';

const SYSTEM = `You help school students write an Implementation Record: a short, honest account of a sustainability project that another school could reuse.
Write in plain English for a 14-year-old reader at another school. Use the numbers given; never invent numbers, names or events.
Failures and obstacles are valuable: state them plainly and without blame.
Return only JSON with three string fields: "summary" (one sentence with the key numbers), "intervention" (what was done, who did it, where; under 90 words), "lessons" (what to do differently; under 70 words).`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return json({ error: 'Sign in first.' }, 401);

  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'AI drafting is not configured.' }, 501);

  const facts = await req.json();
  const allowed = ['title', 'problem', 'solution', 'outcomes', 'obstacles', 'approvals', 'budget'];
  const clean = Object.fromEntries(Object.entries(facts).filter(([k]) => allowed.includes(k)));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-5-5',
      max_tokens: 800,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Project facts as JSON:\n${JSON.stringify(clean).slice(0, 12000)}` }],
    }),
  });
  if (!res.ok) return json({ error: 'The drafting service did not respond.' }, 502);
  const out = await res.json();
  const text: string = out?.content?.[0]?.text ?? '';
  try {
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return json({ summary: String(parsed.summary ?? ''), intervention: String(parsed.intervention ?? ''), lessons: String(parsed.lessons ?? '') });
  } catch {
    return json({ error: 'Could not read the draft.' }, 502);
  }
});
