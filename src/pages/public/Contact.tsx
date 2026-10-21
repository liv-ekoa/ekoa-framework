import { config } from '@/lib/config';
import { LinkButton } from '@/components/ui';
import { ReportConcern } from '@/components/ReportConcern';

export default function Contact() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Contact</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <section className="rounded-panel border border-paper-line bg-white p-6">
          <h2 className="text-lg font-semibold">General questions</h2>
          <p className="mt-2 text-ink-soft">Partnerships, press and anything else.</p>
          <a href={`mailto:${config.contactEmail}`} className="mt-4 inline-block font-bold text-leaf-600 underline-offset-2 hover:underline">{config.contactEmail}</a>
        </section>
        <section className="rounded-panel border border-paper-line bg-white p-6">
          <h2 className="text-lg font-semibold">Joining</h2>
          <p className="mt-2 text-ink-soft">Schools, educators, student leaders and organisations.</p>
          <LinkButton to="/join" variant="dark" className="mt-4">Apply to join</LinkButton>
        </section>
        <section className="rounded-panel border border-paper-line bg-white p-6">
          <h2 className="text-lg font-semibold">Safeguarding</h2>
          <p className="mt-2 text-ink-soft">Reports reach the safeguarding lead directly and get a response within 24 hours.</p>
          <div className="mt-4"><ReportConcern variant="button" /></div>
        </section>
      </div>
    </div>
  );
}
