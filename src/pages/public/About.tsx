import { LinkButton } from '@/components/ui';
import { EkoaLetters } from '@/components/Ekoa';

export default function About() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold sm:text-5xl">About</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">Ekoa is a student-built implementation network for school sustainability. We believe the infrastructure to connect and sustain student-led climate action should be open, shared and built by the students who need it most.</p>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">It is not a top-down initiative. It is being shaped, tested and grown by the founding cohort: schools, educators, coordinators and youth organisations from every region.</p>
      </div>
      <section className="mt-14">
        <h2 className="mb-6 text-3xl">What Ekoa stands for</h2>
        <EkoaLetters />
      </section>
      <section className="mt-14">
        <h2 className="text-3xl">Founders</h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
          {[
            ['Samar Raj Sharma', 'Co-founder', 'Faridabad, India'],
            ['Olivia Janelle Lacour', 'Co-founder', 'Bali, Indonesia'],
          ].map(([n, r, c]) => (
            <li key={n} className="rounded-panel border border-paper-line bg-white p-6">
              <p className="font-display text-xl font-semibold">{n}</p>
              <p className="text-ink-soft">{r}</p>
              <p className="mt-2 text-sm text-ink-mute">{c}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-14 max-w-3xl">
        <h2 className="text-3xl">How we are governed</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-soft">
          <li>A steering group of the founders, at least one adult faculty advisor, the Ekoa safeguarding lead and one student representative per pilot school.</li>
          <li>A council of Ekoa Representatives votes on roadmap priorities each term.</li>
          <li>Schools own their data. Verified, school-level records are published openly under CC BY 4.0.</li>
          <li>No sponsor can edit or suppress outcome data.</li>
          <li>Peer audits (tier T3) are carried out by two founding audit schools, Shiv Nadar School, Faridabad and Green School, Bali, and never by the school being audited.</li>
        </ul>
        <LinkButton to="/join" variant="clay" className="mt-8">Join the founding cohort</LinkButton>
      </section>
    </div>
  );
}
