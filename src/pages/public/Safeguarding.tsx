import { ReportConcern } from '@/components/ReportConcern';

export default function Safeguarding() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold sm:text-5xl">Safeguarding and privacy</h1>
          <p className="text-ink-soft">This platform connects students under 18 across countries. Keeping them safe comes before every feature.</p>
          <div className="rounded-panel border border-alert/30 bg-alert-100 p-5">
            <p className="font-bold text-ink">Worried about a child right now?</p>
            <p className="mt-1 text-sm text-ink-soft">Call your local emergency number. In India call 112, or Childline on 1098.</p>
            <div className="mt-3"><ReportConcern variant="button" /></div>
          </div>
        </div>
        <div className="prose-ekoa">
          <h2>How we keep students safe</h2>
          <ul>
            <li>Adults and students never message one-to-one. All contact happens in group spaces where the student’s faculty liaison can see it.</li>
            <li>Students from different schools talk only in moderated circle threads. Posts with phone numbers, email addresses or social handles are held automatically for review.</li>
            <li>Live calls are scheduled on the platform with at least two adults present, one from the Ekoa team. Calls are not recorded without consent.</li>
            <li>Every adult with access to students completes the background check that applies in their country and signs our code of conduct.</li>
            <li>Public pages show schools, not children. We never publish student names, and photos with identifiable students need explicit guardian consent.</li>
            <li>Every school has a designated safeguarding contact, and Ekoa has a trained safeguarding lead who responds to reports within 24 hours. Concerns are escalated to schools and to authorities as local law requires, including mandatory reporting under India’s POCSO Act, 2012.</li>
          </ul>
          <h2>Consent</h2>
          <p>Student accounts for anyone under 18 stay switched off until a parent or guardian gives consent through a link from the school. Guardians choose exactly what they allow: the account itself, cross-school circles, photos, and whether a name may appear on records. Consent can be withdrawn at any time.</p>
          <h2>Your data</h2>
          <ul>
            <li>We store an age band, never a date of birth, and we never track location. Photos are stripped of location data when uploaded.</li>
            <li>Schools own their data and can export it at any time.</li>
            <li>We use no advertising, no tracking cookies and no behavioural profiling.</li>
            <li>We follow India’s Digital Personal Data Protection Act, 2023, Indonesia’s Personal Data Protection Law (Law No. 27 of 2022), and the GDPR and UK Age Appropriate Design Code where they apply.</li>
            <li>Student personal data is deleted or anonymised after a student leaves, unless they choose to stay on as alumni.</li>
          </ul>
          <h2>Questions</h2>
          <p>Write to the safeguarding lead through the contact page, or use “Report a concern” on any page.</p>
        </div>
      </div>
    </div>
  );
}
