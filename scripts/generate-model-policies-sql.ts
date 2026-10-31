// Prints the SQL that adds the Ekoa model policies and their clauses (src/lib/modelPolicies.ts).
// Safe to run more than once: existing clauses and policies are left alone.
import { MODEL_CLAUSES, MODEL_POLICIES } from '../src/lib/modelPolicies';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const out: string[] = [];
out.push(`insert into public.policy_clauses (section, title, body)
select v.section, v.title, v.body from (values
${MODEL_CLAUSES.map(([s, t, b]) => `  (${q(s)}, ${q(t)}, ${q(b)})`).join(',\n')}
) as v (section, title, body)
where not exists (select 1 from public.policy_clauses c where c.section = v.section);`);
for (const p of MODEL_POLICIES) {
  out.push(`insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, ${q(p.title)}, 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', ${q(`${p.area}_purpose`)}, 'title', 'Purpose', 'body', ${q(p.intro)}, 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array[${p.clauses.map(q).join(', ')}]) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = ${q(p.title)})
order by o.created_at limit 1;`);
}
console.log(out.join('\n\n'));
