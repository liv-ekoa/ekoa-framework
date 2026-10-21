import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, RotateCcw, ShieldCheck, Trophy } from 'lucide-react';
import { listOrgs, listPublicRecords, listSchoolRanking } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { STAGES } from '@/lib/ekoa';
import { RecordTag } from '@/components/RecordTag';
import { StageRing } from '@/components/Logo';
import { EkoaLetters } from '@/components/Ekoa';
import { EkoaWordmark } from '@/components/EkoaLogo';
import { LinkButton } from '@/components/ui';

// The three problems and six answers carried over from the original ekoa-framework.org.
const PROBLEMS: [string, string][] = [
  ['Projects restart every year', 'When student leaders graduate, their sustainability initiatives often disappear entirely. Schools lose institutional memory and start from scratch.'],
  ['No cross-border collaboration', 'Thousands of eco clubs operate in isolation. A solution that works in Singapore never reaches São Paulo, not because of distance, but because there is no infrastructure to connect them.'],
  ['Awareness without implementation', 'Schools host sustainability weeks and awareness campaigns, but rarely move into measurable, lasting change. Intent is abundant. Execution infrastructure is not.'],
];
const ANSWERS: [string, string][] = [
  ['Exchange proven models', 'Share sustainability frameworks that work across schools and regions.'],
  ['Collaborate across borders', 'Connect student leaders across countries and institutions.'],
  ['Measure real-world impact', 'Track the outcomes of every initiative, not just intentions.'],
  ['Document failures openly', 'A shared record of lessons, so others don’t repeat mistakes.'],
  ['Build lasting continuity', 'Handover systems, so a leadership change doesn’t mean starting over.'],
  ['Scale globally', 'Take what works in one school to thousands.'],
];
const COMPARISON: [string, string][] = [
  ['Localised', 'Global'],
  ['Awareness campaigns', 'Implementation systems'],
  ['Short-term leadership', 'Continuity infrastructure'],
  ['Isolated projects', 'Cross-school scalability'],
  ['Participation metrics', 'Impact metrics'],
];
const AUDIENCE = [
  'Schools and school networks',
  'Sustainability coordinators and eco clubs',
  'Student leaders and youth organisations',
  'Climate-focused NGOs and partners',
  'Educators and advisors',
  'ESG and sustainability institutions',
];

export default function Home() {
  const { data } = useData(async () => {
    const [records, orgs, ranking] = await Promise.all([listPublicRecords(), listOrgs('school'), listSchoolRanking()]);
    return { records, orgs: orgs.filter((o) => o.public_visible), ranking };
  });
  const records = data?.records ?? [];
  const orgName = (id: string) => data?.orgs.find((o) => o.id === id)?.name;
  const failed = records.find((r) => r.outcome_class === 'did_not_work');
  const others = records.filter((r) => r.id !== failed?.id).slice(0, 3);
  const schools = data?.orgs.filter((o) => !o.audit_school) ?? [];
  const countries = new Set(schools.map((o) => o.country)).size;
  const failures = records.filter((r) => r.outcome_class === 'did_not_work' || r.outcome_class === 'partly').length;

  return (
    <>
      {/* Hero: the lizard on the leaf, from the Ekoa deck */}
      <section className="px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="relative mx-auto flex min-h-[600px] max-w-[1320px] overflow-hidden rounded-[28px] bg-moss sm:min-h-[640px]">
          <img
            src="/img/lizard-1600.webp"
            srcSet="/img/lizard-900.webp 900w, /img/lizard-1600.webp 1600w"
            sizes="(min-width: 1320px) 1320px, 100vw"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-shadow/85 via-shadow/50 to-shadow/5" aria-hidden />
          <div className="pointer-events-none absolute inset-3 rounded-[20px] border border-paper/25 sm:inset-4" aria-hidden />
          <span className="eyebrow-light absolute left-7 top-8 sm:left-14 sm:top-12">Building the founding cohort</span>
          <div className="relative flex w-full flex-col justify-end px-7 pb-10 pt-28 sm:px-14 sm:pb-14 lg:max-w-[760px]">
            <EkoaWordmark className="h-10 w-auto self-start text-paper sm:h-12" />
            <h1 className="mt-6 max-w-[14ch] text-5xl leading-[0.98] text-paper sm:text-6xl lg:text-[5.4rem]">From enthusiasm to lasting action.</h1>
            <p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-paper/90">
              Climate action in schools shouldn’t restart from zero every year. Ekoa is the shared record of what schools tried, what it cost, who had to approve it and whether it worked, so the next school starts from a tested model.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="/join" variant="clay" size="lg">Join the founding cohort</LinkButton>
              <Link to="/library" className="inline-flex items-center gap-2 rounded-full border border-paper/40 px-6 py-3 text-lg font-semibold text-paper hover:bg-paper/10">Read the library</Link>
            </div>
          </div>
        </div>
      </section>

      {/* EKOA */}
      <section className="mx-auto max-w-page px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <span className="eyebrow">01 / What Ekoa means</span>
          <h2 className="mt-5 text-4xl sm:text-5xl">Four letters, four jobs.</h2>
          <p className="mt-4 text-lg text-ink-soft">Each part of the name is something the platform does for a school.</p>
        </div>
        <EkoaLetters />
      </section>

      {/* The problem, from the original site, with the deck's "reset to zero" */}
      <section className="grain border-y border-paper-line">
        <div className="mx-auto max-w-page px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <span className="eyebrow">02 / The problem</span>
              <h2 className="mt-5 text-4xl sm:text-5xl">The world has passionate students. It’s missing coordinated execution.</h2>
              <p className="mt-5 text-lg text-ink-soft">1.5 billion students attend school. Without a system, a project launches, its leaders graduate, and the school resets to zero.</p>
              <ol className="mt-8 grid grid-cols-3 gap-2 sm:gap-3" aria-label="What happens without a system">
                {['Project launch', 'Graduation'].map((s) => (
                  <li key={s} className="flex min-h-[110px] items-center justify-center rounded-panel border-2 border-paper-line bg-paper-deep/70 p-2 text-center font-display text-lg font-semibold italic leading-tight [hyphens:auto] sm:text-xl xl:text-2xl" lang="en">{s}</li>
                ))}
                <li className="flex min-h-[110px] flex-col items-center justify-center gap-1 rounded-panel border-2 border-clay bg-clay-100 p-2 text-center font-display text-lg font-semibold italic leading-tight text-clay-700 sm:text-xl xl:text-2xl">
                  Reset to zero <RotateCcw className="h-4 w-4" aria-hidden />
                </li>
              </ol>
            </div>
            <ul className="space-y-4">
              {PROBLEMS.map(([t, b], i) => (
                <li key={t} className="rounded-panel border border-paper-line bg-white p-6">
                  <p className="font-display text-lg font-semibold italic text-clay-700">0{i + 1}</p>
                  <h3 className="mt-1 text-2xl">{t}</h3>
                  <p className="mt-2 text-ink-soft">{b}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The answer */}
      <section className="mx-auto max-w-page px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <span className="eyebrow">03 / The answer</span>
            <h2 className="mt-5 text-4xl sm:text-5xl">A global implementation network, built by students for students.</h2>
            <p className="mt-4 text-lg text-ink-soft">Not another awareness initiative. Infrastructure that makes student-led sustainability collaborative, measurable, scalable and lasting.</p>
            <div className="mt-8 overflow-hidden rounded-panel border border-paper-line bg-white">
              <table className="w-full text-left">
                <caption className="sr-only">Traditional eco clubs compared with Ekoa</caption>
                <thead>
                  <tr className="border-b border-paper-line">
                    <th scope="col" className="label-caps px-5 py-3 text-ink-mute">Traditional eco clubs</th>
                    <th scope="col" className="label-caps bg-leaf-50 px-5 py-3 text-leaf-600">Ekoa</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map(([a, b]) => (
                    <tr key={a} className="border-b border-paper-line last:border-0">
                      <td className="px-5 py-3 text-ink-mute line-through decoration-ink/20">{a}</td>
                      <td className="bg-leaf-50 px-5 py-3 font-bold text-ink">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {ANSWERS.map(([t, b]) => (
              <li key={t} className="rounded-panel border border-paper-line bg-white p-6">
                <span className="mb-4 block h-1 w-10 rounded-full bg-clay" aria-hidden />
                <h3 className="text-xl">{t}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The cycle */}
      <section className="bg-moss text-paper">
        <div className="mx-auto max-w-page px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="eyebrow-light">04 / The cycle</span>
              <h2 className="mt-5 text-4xl text-paper sm:text-5xl">Six stages. Each one leaves something the next school can use.</h2>
              <p className="mt-4 text-lg text-paper/85">A stage only closes when its evidence is in place and the right person signs it off.</p>
            </div>
            <Link to="/how-it-works" className="inline-flex items-center gap-1 font-bold text-paper hover:underline">
              How the gates work <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-panel border border-paper/15 bg-paper/15 sm:grid-cols-2 lg:grid-cols-3">
            {STAGES.map((s) => (
              <li key={s.key} className="bg-moss p-6">
                <div className="flex items-center gap-3">
                  <StageRing stage={s.key} size={34} light />
                  <span className="label-caps tabular-nums text-paper/80">Stage {s.n}</span>
                </div>
                <h3 className="mt-4 text-2xl text-paper">{s.name}</h3>
                <p className="mt-1 text-paper/90">{s.does}.</p>
                <p className="mt-3 text-sm text-paper/80">Leaves behind: {s.captures.toLowerCase()}.</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Peer audit and ranking */}
      <section className="mx-auto max-w-page px-4 py-20 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col rounded-panel border border-paper-line bg-white p-7 sm:p-9">
            <ShieldCheck className="h-8 w-8 text-clay-600" aria-hidden />
            <h2 className="mt-5 text-3xl sm:text-4xl">Checked by peers, not by the school itself.</h2>
            <p className="mt-3 flex-1 text-ink-soft">
              A result reaches tier T3 only after an Ekoa audit school checks the raw numbers and evidence against the protocol: <strong className="text-ink">Shiv Nadar School, Faridabad</strong> or <strong className="text-ink">Green School, Bali</strong>. No school ever audits its own work.
            </p>
            <Link to="/how-it-works#peer-audit" className="mt-6 inline-flex items-center gap-1 font-bold text-leaf-600 hover:underline">How peer audit works <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="flex flex-col rounded-panel border border-paper-line bg-white p-7 sm:p-9">
            <Trophy className="h-8 w-8 text-clay-600" aria-hidden />
            <h2 className="mt-5 text-3xl sm:text-4xl">Ranked on verified impact.</h2>
            <p className="mt-3 text-ink-soft">Schools climb by publishing checked results and building models others adapt. Sign-ups don’t count.</p>
            <ol className="mt-5 flex-1 space-y-2">
              {(data?.ranking ?? []).slice(0, 3).map((r) => (
                <li key={r.org_id} className="flex items-center gap-4 rounded-field bg-paper px-4 py-2.5">
                  <span className="w-6 font-display text-2xl font-semibold italic text-clay-700">{r.position}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{r.name}</span>
                  <span className="tabular-nums text-sm text-ink-mute">{Math.round(r.score)} pts</span>
                </li>
              ))}
            </ol>
            <Link to="/ranking" className="mt-6 inline-flex items-center gap-1 font-bold text-leaf-600 hover:underline">See the full ranking <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Evidence so far */}
      <section className="mx-auto max-w-page px-4 pb-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <span className="eyebrow">05 / Recorded so far</span>
            <h2 className="mt-5 text-4xl">The record is the result.</h2>
            <p className="mt-3 text-ink-soft">
              {data ? `${schools.length} schools in ${countries} countries have published ${records.length} records. ${failures} of them did not fully work, and say so.` : 'Loading the latest records.'}
            </p>
            {failed && (
              <div className="mt-8 hidden lg:block" aria-hidden>
                <p className="hand-note max-w-[16rem] -rotate-2">A failure, published on purpose. Its lessons are the result.</p>
                <svg width="60" height="40" viewBox="0 0 60 40" className="ml-40 mt-1 text-clay-700">
                  <path d="M4 4 C 24 6, 44 14, 54 34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M47 31 L54 35 L56 27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <LinkButton to="/library" variant="ghost" className="mt-6">Browse every record</LinkButton>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {failed && <RecordTag r={failed} href={`/library/${failed.id}`} compact schoolName={orgName(failed.org_id)} />}
            {others.map((r) => (
              <RecordTag key={r.id} r={r} href={`/library/${r.id}`} compact schoolName={orgName(r.org_id)} />
            ))}
          </div>
        </div>
      </section>

      {/* Quote from the original site */}
      <section className="mx-auto max-w-page px-4 sm:px-6">
        <figure className="mx-auto max-w-3xl py-6 text-center">
          <blockquote className="font-display text-3xl font-semibold italic leading-snug sm:text-4xl">“Climate action in schools should not restart from zero every year.”</blockquote>
          <figcaption className="mt-5 space-y-1 text-ink-soft">
            <p>The world already has passionate students. It already has eco clubs. It already has ideas.</p>
            <p className="font-bold text-ink">What’s missing is coordinated execution.</p>
          </figcaption>
        </figure>
      </section>

      {/* Join */}
      <section className="mx-auto max-w-page px-4 pt-14 sm:px-6">
        <div className="grid gap-10 rounded-[28px] bg-moss p-8 text-paper sm:p-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow-light">Join us</span>
            <h2 className="mt-5 text-4xl text-paper sm:text-5xl">We’re forming the founding cohort.</h2>
            <p className="mt-4 max-w-[48ch] text-lg text-paper/85">
              This is not a top-down initiative. It is being shaped, tested and grown by the schools, educators, coordinators and youth organisations who join first. No sustainability head? One teacher and one student are enough to start.
            </p>
            <LinkButton to="/join" variant="clay" size="lg" className="mt-8">Apply to join</LinkButton>
          </div>
          <ul className="grid content-start gap-3 sm:grid-cols-2">
            {AUDIENCE.map((a) => (
              <li key={a} className="rounded-field border border-paper/20 px-4 py-3 text-paper/90">{a}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
