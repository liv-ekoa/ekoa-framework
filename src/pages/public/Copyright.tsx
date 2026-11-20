import { config } from '@/lib/config';

const updated = 'November 2026';

export default function Copyright() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold sm:text-5xl">Copyright, credits and takedowns</h1>
        <p className="mt-3 text-sm text-ink-mute">Last updated: {updated}. This is a draft and is not legal advice. It will be reviewed before launch.</p>
        <div className="mt-10 prose-ekoa">
          <h2>1. What belongs to whom</h2>
          <p>Schools and students keep the rights to the work they put on Ekoa. By publishing a record to the network, a school gives Ekoa and other member schools permission to read it, copy it for their own projects and adapt it, with credit to the original project. The Ekoa name, logo and site design belong to Ekoa. The site code is open source under the MIT licence, and its third-party notices are listed in the project repository.</p>

          <h2>2. Example records</h2>
          <p>Some records in the Library are examples. They are our own written summaries of public student talks and public school web pages, such as Green School Bali Quest presentations. They are marked as examples and name their source. We write them in our own words, list contributors by role and leave out students' names. They are self-reported and have not been audited. They are not endorsed by the schools or students they describe, and they are not a substitute for the original work, which we encourage you to watch and read.</p>
          <p>If you made or appear in a project we have summarised, you can ask us to correct it, add credit or remove it. We will do so quickly. For a student under 18, a parent, guardian or teacher can ask on their behalf.</p>

          <h2>3. Your content must be yours to share</h2>
          <p>Only upload photos, text, data or other material that you made, or that you have permission to share. Do not upload other people's photos, music, logos, artwork or writing unless you have the right to. Photos that show a student need the guardian's photo consent. Content that breaks these rules may be removed and repeat breaches may lead to an account being closed.</p>

          <h2>4. Reporting a copyright or content problem</h2>
          <p>If you believe something on Ekoa infringes your rights, or shows or names a student without permission, email {config.contactEmail} with:</p>
          <ul>
            <li>the web address of the page;</li>
            <li>what the material is and why you believe it is yours or should not be shown;</li>
            <li>your name and a way to reach you; and</li>
            <li>a statement that the information you give is accurate and that you are the owner or authorised to act for them.</li>
          </ul>
          <p>We will acknowledge your message, hide the material while we look at it where there is a safety or privacy concern, and tell you what we decided. If the person who posted it believes we got it wrong, they can reply and we will review it again.</p>

          <h2>5. Sources and accuracy</h2>
          <p>We try to describe projects accurately and to say what was measured and what was not. Records are written by schools or, for examples, by us from public sources. Numbers are those the source gives. If we got something wrong, tell us and we will fix it.</p>

          <h2>6. Contact</h2>
          <p>Email {config.contactEmail}.</p>
        </div>
      </div>
    </div>
  );
}
