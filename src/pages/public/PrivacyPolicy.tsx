import { config } from '@/lib/config';

const updated = 'October 2026';

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold sm:text-5xl">Privacy policy</h1>
        <p className="mt-3 text-sm text-ink-mute">Last updated: {updated}. This policy is a draft and will change before launch.</p>
        <div className="mt-10 prose-ekoa">
          <p className="text-ink">Ekoa is the implementation network for student-led school sustainability. This policy explains what we collect, why we collect it and the choices you have. It applies to everyone who visits ekoa-framework.org or uses the Ekoa platform — visitors, schools, students, guardians, stewards and partners.</p>

          <h2>1. Who we are</h2>
          <p>Ekoa is operated by the Ekoa Stewards organisation. If you have questions about this policy or your data, email {config.contactEmail}. We are committed to protecting personal data, especially the data of people under 18.</p>

          <h2>2. The data we collect</h2>
          <p>We keep what we collect to the minimum the platform needs. We collect:</p>
          <ul>
            <li><strong>Account data</strong> — name, email address, an age band (never a date of birth), and the school or organisation a person belongs to.</li>
            <li><strong>Invitation and role data</strong> — which school invited someone, their role (for example faculty liaison, project lead, steward), and the start and end of their term.</li>
            <li><strong>Guardian consent records</strong> — for members under 18, a guardian's name, email and their choices about the account, cross-school circles, photos and whether a name may appear on records.</li>
            <li><strong>Project content</strong> — the project descriptions, plans, budgets, measurements, records, posts and other content students and schools create on the platform.</li>
            <li><strong>Technical data</strong> — the small amount of data needed to run the site, such as IP address, browser type and pages visited, processed automatically by our hosting and content-delivery provider.</li>
          </ul>
          <p>We do not collect a date of birth, precise location, or device identifiers beyond what is needed to run the site. We do not engage in behavioural advertising, and we do not use tracking cookies for advertising purposes.</p>

          <h2>3. Why we collect it</h2>
          <p>We use the data we collect to:</p>
          <ul>
            <li>operate the platform and connect a signed-in person to the school and roles they were invited to;</li>
            <li>let schools manage their members, projects and records;</li>
            <li>manage guardian consent for members under 18 and keep minors safe;</li>
            <li>publish anonymised records in the public Library, where a school has agreed to that (see “Public records” below);</li>
            <li>generate the public school ranking from verified, published records;</li>
            <li>keep the platform secure, prevent abuse and comply with the law.</li>
          </ul>

          <h2>4. Minors (people under 18)</h2>
          <p>Ekoa is built for students, many of them under 18. We take extra care with their data:</p>
          <ul>
            <li>A student account for anyone under 18 stays switched off until a parent or guardian gives consent through a link the school sends. The guardian chooses exactly what they allow: the account itself, cross-school circles, photos, and whether a name may appear on records.</li>
            <li>Consent can be withdrawn at any time. When it is withdrawn, the relevant processing stops.</li>
            <li>We never publish student names, and photos showing identifiable students need explicit guardian consent.</li>
            <li>Students use age bands, not dates of birth.</li>
          </ul>

          <h2>5. Public records and anonymisation</h2>
          <p>When a school publishes an implementation record, it may appear in the public Library. Public pages show schools, not children. Published records are anonymised and reviewed before they go public: student names are removed, and personal details are hidden. A school can choose to keep its records private instead.</p>

          <h2>6. Who we share data with</h2>
          <p>We do not sell personal data. We share it only in these cases:</p>
          <ul>
            <li><strong>Within Ekoa</strong> — stewards and safeguarding leads have access to data they need to run and protect the platform.</li>
            <li><strong>With your school</strong> — a school's faculty liaison can manage the members of their own school and see that school's data. Schools own the data of their own members and projects.</li>
            <li><strong>With service providers</strong> — we use trusted providers to host and serve the platform. The site runs on Cloudflare's global network, and data is stored with Supabase. These providers act on our instructions and have obligations to protect data.</li>
            <li><strong>With authorities</strong> — where local law requires it, including mandatory reporting of safeguarding concerns, we may share data with schools and authorities. In India, this includes the POCSO Act, 2012.</li>
          </ul>

          <h2>7. Where data is stored</h2>
          <p>Ekoa operates globally. Data is stored on Supabase's servers and served to visitors through Cloudflare's worldwide network, so your data may be processed in a country other than the one you live in. When we transfer personal data across borders, we rely on recognised safeguards and applicable law, including India's Digital Personal Data Protection Act, 2023, Indonesia's Personal Data Protection Law (Law No. 27 of 2022), and the GDPR where it applies.</p>

          <h2>8. How long we keep data</h2>
          <p>We keep data for as long as it is needed for the purpose it was collected. Student personal data is deleted or anonymised after a student leaves a school, unless they choose to stay on as alumni. Records a school has published may be kept as the school's record, in anonymised form where they are public. Consent records are kept where the law requires a record of consent.</p>

          <h2>9. Your rights</h2>
          <p>Depending on where you live, you may have the right to:</p>
          <ul>
            <li>see the personal data we hold about you;</li>
            <li>ask us to correct incorrect data;</li>
            <li>ask us to delete or anonymise your data;</li>
            <li>get a copy of your data in a portable form;</li>
            <li>withdraw consent at any time; and</li>
            <li>lodge a complaint with a data protection authority.</li>
          </ul>
          <p>Schools can export their own data at any time from the platform. To exercise these rights, email {config.contactEmail}. We will respond within the timeframes the law allows.</p>

          <h2>10. Security</h2>
          <p>We protect data with the capabilities of our providers and our own controls: encrypted connections, database access rules that limit what each role can see, and restricted access to personal data. No system is completely secure, and we cannot guarantee absolute security.</p>

          <h2>11. Changes to this policy</h2>
          <p>We may update this policy as the platform and laws evolve. When we make material changes, we will update the date above and, where practical, let schools and members know. Continued use of Ekoa after a change means you accept the updated policy.</p>

          <h2>12. Contact</h2>
          <p>For privacy questions, requests or concerns, email {config.contactEmail}. For an urgent safeguarding concern about a child, use the “Report a concern” link on any page or contact your local emergency number.</p>

        </div>
      </div>
    </div>
  );
}
