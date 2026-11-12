import { useMemo, useState } from 'react';
import { COST_BANDS } from '@/lib/budget';
import { Search } from 'lucide-react';
import { CATEGORIES, OBSTACLE_TAXONOMY, OUTCOMES, isLiveRecord } from '@/lib/ekoa';
import { similarity } from '@/lib/context';
import type { ContextProfile, ImplementationRecord, Organisation, OutcomeClass } from '@/lib/types';
import { PolicyCard } from './PolicyCard';
import { RecordTag } from './RecordTag';
import type { PolicyEntry } from '@/lib/policyLibrary';
import { Empty, Select, cx } from './ui';

// Plain-language search: expands common words so "cheap" finds low-budget records,
// "lunch" finds canteen records, and so on. With Supabase, pgvector can replace this.
const SYNONYMS: Record<string, string[]> = {
  cheap: ['low', 'zero', 'reused', 'budget'],
  free: ['zero', 'reused'],
  lunch: ['canteen', 'meal', 'plate', 'food'],
  food: ['canteen', 'meal', 'compost', 'plate'],
  compost: ['composting', 'vermicompost', 'drum', 'worm'],
  plastic: ['single-use', 'bottle', 'cup', 'wrapper'],
  hot: ['heat', 'semi-arid', 'tropical'],
  rain: ['monsoon', 'tropical'],
  bins: ['segregation', 'sorting', 'station'],
  sorting: ['segregation', 'bins'],
  approval: ['principal', 'management', 'committee'],
  failed: ['did_not_work', 'failure', 'stopped'],
};

export function searchScore(r: ImplementationRecord, q: string) {
  const words = q.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length > 2);
  if (!words.length) return 1;
  const fields: [string, number][] = [
    [r.title, 4], [r.summary, 3], [r.category, 3], [r.intervention, 2], [r.lessons, 2], [r.problem, 1],
    [r.obstacles.map((o) => o.category + ' ' + o.note).join(' '), 1], [`${r.context.climate_zone} ${r.context.budget_band} ${r.context.country} ${r.outcome_class}`, 2],
  ];
  let score = 0;
  for (const w of words) {
    const terms = [w, ...(SYNONYMS[w] ?? [])];
    for (const [text, weight] of fields) {
      const t = text.toLowerCase();
      if (terms.some((x) => t.includes(x))) score += weight;
    }
  }
  return score;
}

function policyScore(p: PolicyEntry, q: string) {
  const words = q.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length > 2);
  if (!words.length) return 1;
  const text = `${p.title} ${p.topic} ${p.category} ${p.school} ${p.summary}`.toLowerCase();
  return words.reduce((n, w) => n + ([w, ...(SYNONYMS[w] ?? [])].some((x) => text.includes(x)) ? 1 : 0), 0);
}

type Kind = '' | 'record' | 'policy';
type Item = { kind: 'record'; r: ImplementationRecord; score: number; sim: number } | { kind: 'policy'; p: PolicyEntry; score: number };

export function LibraryBrowser({ records, orgs, myContext, hrefBase, myOrgId, policies = [] }: { records: ImplementationRecord[]; orgs: Organisation[]; myContext?: ContextProfile | null; hrefBase: string; myOrgId?: string; policies?: PolicyEntry[] }) {
  const [kind, setKind] = useState<Kind>('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | 'live' | 'completed'>('');
  const [cat, setCat] = useState('');
  const [outcome, setOutcome] = useState<'' | OutcomeClass>('');
  const [budget, setBudget] = useState('');
  const [climate, setClimate] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [tier, setTier] = useState(0);
  const [sort, setSort] = useState<'relevance' | 'similar' | 'recent'>(myContext ? 'similar' : 'relevance');

  const climates = useMemo(() => [...new Set(records.map((r) => r.context.climate_zone))].sort(), [records]);
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name;

  // Outcome, cost, climate, obstacle and tier describe project records only, so choosing one hides policies.
  const recordOnlyFilter = !!(status || outcome || budget || climate || obstacle || tier);
  const results = useMemo(() => {
    const recs: Item[] = kind === 'policy' ? [] : records
      .filter((r) => !status || (status === 'live') === isLiveRecord(r))
      .filter((r) => (!cat || r.category === cat) && (!outcome || r.outcome_class === outcome) && (!budget || !!COST_BANDS.find((b) => b.key === budget)?.test(r.budget_amount_usd ?? 0)))
      .filter((r) => (!climate || r.context.climate_zone === climate) && (!obstacle || r.obstacles.some((o) => o.category === obstacle)) && r.tier >= tier)
      .map((r) => ({ kind: 'record' as const, r, score: searchScore(r, q), sim: r.org_id === myOrgId ? -1 : similarity(myContext, r.context) }))
      .filter((x) => x.score > 0);
    const pols: Item[] = kind === 'record' || recordOnlyFilter ? [] : policies
      .filter((p) => !cat || p.category === cat)
      .map((p) => ({ kind: 'policy' as const, p, score: policyScore(p, q) }))
      .filter((x) => x.score > 0);
    const rank = (x: Item) => x.score;
    if (sort === 'similar') recs.sort((a, b) => (b.kind === 'record' && a.kind === 'record' ? b.sim - a.sim : 0) || rank(b) - rank(a));
    else if (sort === 'recent') recs.sort((a, b) => (b.kind === 'record' && a.kind === 'record' ? (b.r.published_at ?? b.r.updated_at).localeCompare(a.r.published_at ?? a.r.updated_at) : 0));
    else recs.sort((a, b) => rank(b) - rank(a));
    // Policies follow the records, or lead when searching, so a good policy match is not buried.
    return q.trim() ? [...recs, ...pols].sort((a, b) => rank(b) - rank(a)) : [...recs, ...pols];
  }, [records, policies, kind, q, status, cat, outcome, budget, climate, obstacle, tier, sort, myContext, recordOnlyFilter]);
  const recordCount = results.filter((x) => x.kind === 'record').length;
  const policyCount = results.length - recordCount;

  const active = [status, cat, outcome, budget, climate, obstacle].filter(Boolean).length + (tier ? 1 : 0);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask in plain words, for example: cheap way to cut canteen food waste in a hot climate"
          aria-label="Search the library"
          className="field-input py-3 pl-11 text-lg"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as '' | 'live' | 'completed')}>
          <option value="">Live and completed</option>
          <option value="live">Live projects</option>
          <option value="completed">Completed</option>
        </Select>
        {policies.length > 0 && (
          <Select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="">All types</option>
            <option value="record">Project records</option>
            <option value="policy">Policies</option>
          </Select>
        )}
        <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select aria-label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as OutcomeClass | '')}>
          <option value="">Any outcome</option>
          {Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select aria-label="Cost" value={budget} onChange={(e) => setBudget(e.target.value)}>
          <option value="">Any cost</option>
          {COST_BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </Select>
        <Select aria-label="Climate" value={climate} onChange={(e) => setClimate(e.target.value)}>
          <option value="">Any climate</option>
          {climates.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select aria-label="Obstacle type" value={obstacle} onChange={(e) => setObstacle(e.target.value)}>
          <option value="">Any obstacle</option>
          {OBSTACLE_TAXONOMY.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </Select>
        <Select aria-label="Minimum verification" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
          <option value={0}>Any tier</option>
          <option value={2}>T2 or higher</option>
          <option value={3}>T3 or higher</option>
          <option value={4}>T4 only</option>
        </Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="relevance">Best match</option>
          {myContext && <option value="similar">Most similar to my school</option>}
          <option value="recent">Most recent</option>
        </Select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-mute">
        <span>{recordCount} {recordCount === 1 ? 'record' : 'records'}{policies.length > 0 && <>, {policyCount} {policyCount === 1 ? 'policy' : 'policies'}</>}</span>
        {active > 0 && (
          <button className="font-bold text-ink-soft underline" onClick={() => { setStatus(''); setCat(''); setOutcome(''); setBudget(''); setClimate(''); setObstacle(''); setTier(0); }}>
            Clear {active} {active === 1 ? 'filter' : 'filters'}
          </button>
        )}
      </div>
      {results.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((x) => {
            if (x.kind === 'policy') return <PolicyCard key={x.p.title} p={x.p} />;
            const { r, sim } = x;
            return (
              <div key={r.id} className="relative">
                <RecordTag r={r} href={`${hrefBase}/${r.id}`} schoolName={orgName(r.org_id)} />
                {myContext && sort === 'similar' && (
                  <span className={cx('absolute -top-2.5 left-4 rounded-tag px-2 py-0.5 text-xs font-bold', sim < 0 ? 'bg-sky-100 text-sky' : sim > 0.6 ? 'bg-leaf text-white' : 'bg-paper-deep text-ink-soft')}>
                    {sim < 0 ? 'Your school' : `${Math.round(sim * 100)}% similar context`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty title="Nothing matches">Try fewer filters or different words. Failed and partly-worked records count too: switch the outcome filter to “Did not work”.</Empty>
      )}
    </div>
  );
}
