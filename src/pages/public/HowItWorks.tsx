import { Link } from 'react-router-dom';
import { ShieldCheck, Wallet } from 'lucide-react';
import { STAGES, ROLES, TIERS } from '@/lib/ekoa';
import { StageRing } from '@/components/Logo';
import { EkoaLetters } from '@/components/Ekoa';
import { LinkButton } from '@/components/ui';
import type { RoleKey } from '@/lib/types';

const STEPS = [
  { title: 'A school applies', body: 'It names one teacher as faculty liaison and signs the participation and safeguarding agreement. That teacher is the only adult a school needs.' },
  { title: 'A student takes the lead', body: 'One student becomes the Project Lead, under whatever title the school already uses. Bigger schools can add a team, a board and an Ekoa Representative.' },
  { title: 'Schools exchange tested models', body: 'Teams find records from similar schools, adapt them, measure real impact, state their budget and document what failed.' },
  { title: 'Peers check the results', body: 'An Ekoa audit school checks the numbers, results are published, and schools are ranked on verified impact.' },
];

const AUDIT_STEPS = [
  ['Request', 'The school asks for a T3 audit from its record page, choosing Shiv Nadar School, Faridabad or Green School, Bali. It can never pick itself.'],
  ['Check', 'An auditor at that school checks four things: the baseline followed the protocol, the raw numbers add up, the evidence backs them, and the outcome class is honest.'],
  ['Decide', 'The auditor raises the record to T3 or declines with a reason the school can act on. Both are logged.'],
  ['Count', 'Peer-audited records count one and a half times in the school ranking.'],
];

const ROLE_ORDER: RoleKey[] = ['faculty_liaison', 'project_lead', 'implementation_team', 'ekoa_rep', 'board_member', 'approver', 'auditor'];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <span className="eyebrow">How it works</span>
      <h1 className="mt-5 max-w-3xl text-5xl sm:text-6xl">One school’s project becomes the next school’s starting point.</h1>
      <p className="mt-5 max-w-2xl text-lg text-ink-soft">Ekoa is a network of schools and student leaders, and the method and tools they share. Together they turn tested work into something every school can reuse.</p>

      <section className="mt-16">
        <h2 className="mb-6 text-3xl">What Ekoa stands for</h2>
        <EkoaLetters />
      </section>

      <section className="mt-20">
        <h2 className="text-3xl">Joining, in four steps</h2>
        <ol className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-panel border border-paper-line bg-white p-6">
              <span className="font-display text-4xl font-semibold italic text-clay">{i + 1}</span>
              <h3 className="mt-2 text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="roles" className="mt-20 grid scroll-mt-24 gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="text-3xl">No sustainability head? You can still start.</h2>
          <p className="mt-4 text-ink-soft">Many schools don’t have one, so Ekoa treats roles as jobs, not job titles. The minimum team is <strong className="text-ink">one teacher and one student</strong>.</p>
          <ul className="mt-5 space-y-3 text-ink-soft">
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />The teacher (any subject) is the faculty liaison and can sign every stage.</li>
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />The student is the Project Lead. Keep your own title: eco club president, council member, sustainability head.</li>
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />At a small school one student can hold several roles, and two students can co-lead.</li>
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />Before a project leaves the Implement stage, the next Project Lead is named, so the work survives graduation.</li>
          </ul>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {ROLE_ORDER.map((k) => (
            <div key={k} className="rounded-panel border border-paper-line bg-white p-5">
              <dt className="flex items-center justify-between gap-2">
                <span className="font-display text-xl font-semibold">{ROLES[k].label}</span>
                {(k === 'faculty_liaison' || k === 'project_lead') && <span className="rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-bold text-clay-700">Required</span>}
              </dt>
              <dd className="mt-1 text-sm text-ink-soft">{ROLES[k].description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-20">
        <h2 className="text-3xl">The Ekoa cycle and its gates</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">A project only moves to the next stage when its checklist is complete and the named role signs it off. The platform ticks what it can check itself.</p>
        <div className="mt-6 space-y-3">
          {STAGES.map((s) => (
            <div key={s.key} className="grid gap-4 rounded-panel border border-paper-line bg-white p-5 md:grid-cols-[220px_1fr_220px]">
              <div className="flex items-center gap-3">
                <StageRing stage={s.key} size={36} />
                <div>
                  <p className="label-caps text-ink-mute">Stage {s.n}</p>
                  <h3 className="text-xl">{s.name}</h3>
                </div>
              </div>
              <ul className="space-y-1 text-sm text-ink-soft">
                {s.gate.map((g) => <li key={g.key} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />{g.label}</li>)}
              </ul>
              <p className="text-sm text-ink-mute md:text-right">Signed off by <span className="font-bold text-ink">{s.signer === 'automatic' ? 'the platform' : s.signer === 'faculty_liaison' ? 'the Faculty Liaison' : `the ${ROLES[s.signer].label} or the Faculty Liaison`}</span></p>
            </div>
          ))}
        </div>
      </section>

      <section id="budget" className="mt-20 grid scroll-mt-24 gap-8 rounded-panel border border-paper-line bg-white p-7 sm:p-10 lg:grid-cols-[auto_1fr]">
        <Wallet className="h-10 w-10 text-clay-600" aria-hidden />
        <div>
          <h2 className="text-3xl">Every project states its budget</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            At the Design stage a team lists what it will spend, line by line, and where the money comes from, or marks the project zero-cost. During Implement it records what it actually spent. The record shows planned against actual, so the next school knows the real price before it starts, and the library can be filtered by cost.
          </p>
        </div>
      </section>

      <section id="peer-audit" className="mt-20 scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-clay-600" aria-hidden /><h2 className="text-3xl">Peer-audited by two Ekoa audit schools</h2></div>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Tier T3 means another school has checked your work. Two founding schools carry out every peer audit: <strong className="text-ink">Shiv Nadar School, Faridabad</strong> and <strong className="text-ink">Green School, Bali</strong>. Each audits the other, so no school ever checks itself. Auditors see numbers and evidence, never student names or photos of people.
            </p>
            <ol className="mt-6 space-y-3">
              {AUDIT_STEPS.map(([t, b], i) => (
                <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-panel border border-paper-line bg-white p-4">
                  <span className="font-display text-3xl font-semibold italic leading-none text-clay">{i + 1}</span>
                  <span><span className="block font-bold">{t}</span><span className="text-sm text-ink-soft">{b}</span></span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-2xl">How results are verified</h3>
            <p className="mt-2 text-ink-soft">Every number carries a tier, so readers know how far to trust it.</p>
            <ol className="mt-5 space-y-2">
              {Object.entries(TIERS).map(([k, t]) => (
                <li key={k} className="grid grid-cols-[3rem_1fr] items-baseline gap-2 rounded-field border border-paper-line bg-white px-4 py-3">
                  <span className="font-display text-xl font-semibold text-clay-700">T{k}</span>
                  <span><span className="block font-bold">{t.label.replace(/^T\d /, '')}</span><span className="text-sm text-ink-mute">{t.who}</span></span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-ink-soft">Verified results feed the <Link to="/ranking" className="font-bold text-leaf-600 underline">school ranking</Link>.</p>
          </div>
        </div>
      </section>

      <div className="mt-20 flex flex-wrap gap-3">
        <LinkButton to="/join" variant="clay" size="lg">Join the founding cohort</LinkButton>
        <LinkButton to="/library" variant="ghost" size="lg">See real records</LinkButton>
      </div>
    </div>
  );
}
