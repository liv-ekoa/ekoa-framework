import { Badge, LinkButton } from '@/components/ui';
import { POLICY_CLAUSES } from '@/lib/clauses';

const SECTION_LABELS: Record<string, string> = {
  waste: 'Waste', plastics: 'Plastics', energy: 'Energy', water: 'Water', food: 'Food', procurement: 'Procurement',
  transport: 'Transport', biodiversity: 'Biodiversity', building: 'Buildings and play', curriculum: 'Teaching and training',
  safeguarding: 'Safety and wellbeing',
};
// Only the green-school clauses are shown here; the rest are governance clauses for members.
const SECTIONS = Object.keys(SECTION_LABELS);

const SOURCE = /\s*Source: (.+?) \((https?:\/\/[^)]+)\), adapted\.$/;

export default function PolicyLibrary() {
  const groups = SECTIONS.map((key) => ({
    key,
    clauses: POLICY_CLAUSES.filter(([section]) => section === key),
  })).filter((g) => g.clauses.length > 0);
  const total = groups.reduce((n, g) => n + g.clauses.length, 0);

  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Policy library</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-mute">
        {total} ready-to-adapt clauses for school sustainability policy. Members can add any of them to their own school policy from Governance.
      </p>
      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`pl-${g.key}`}>
            <h2 id={`pl-${g.key}`} className="mb-4 font-display text-2xl font-semibold">{SECTION_LABELS[g.key]}</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {g.clauses.map(([, title, body]) => {
                const m = body.match(SOURCE);
                const text = m ? body.replace(SOURCE, '') : body;
                return (
                  <li key={title} className="rounded-xl border border-line bg-paper p-5">
                    <h3 className="font-display text-lg font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink">{text}</p>
                    {m && (
                      <p className="mt-3 text-xs text-ink-mute">
                        <Badge tone="mute">Adapted</Badge>{' '}
                        <a href={m[2]} target="_blank" rel="noreferrer" className="underline hover:text-ink">{m[1]}</a>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <LinkButton to="/join" variant="dark">Join the founding cohort</LinkButton>
        <LinkButton to="/how-it-works" variant="ghost">See how it works</LinkButton>
      </div>
    </div>
  );
}
