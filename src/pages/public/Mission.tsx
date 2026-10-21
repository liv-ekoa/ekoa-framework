import { LinkButton } from '@/components/ui';

export default function Mission() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Convert awareness into agency.</h1>
          <p className="hand-note mt-6 max-w-xs -rotate-1 text-2xl">From agency to action.</p>
        </div>
        <div className="prose-ekoa">
          <p className="text-lg">We are the most climate-aware generation in history. Schools host sustainability weeks, run recycling drives and simulate global governance in Model UN. Yet the institutions themselves rarely change.</p>
          <h2>Our vision</h2>
          <p>Students graduate having reformed their own institutions, not only having debated global governance.</p>
          <h2>Our mission</h2>
          <p>Give every school the infrastructure to implement, measure, document and hand over sustainability work, so that when students mobilise, institutions evolve.</p>
          <h2>What we believe</h2>
          <ul>
            <li>The problem is not a lack of passion. It is a lack of implementation infrastructure and accountability.</li>
            <li>Failure is data. Schools rarely publish what did not work; we make it part of every record.</li>
            <li>Local first, globally informed. The network shares comparative evidence; it never imposes a solution.</li>
            <li>Structure beats personality. Projects belong to schools, not to the students who start them.</li>
            <li>Schools are micro-governments. Their budgets, approval chains and policies can be redesigned, and students should learn how.</li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/how-it-works" variant="dark">See how it works</LinkButton>
            <LinkButton to="/join" variant="ghost">Join the founding cohort</LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
