import { config } from '@/lib/config';

const updated = 'October 2026';

export default function TermsOfUse() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold sm:text-5xl">Terms of use</h1>
        <p className="mt-3 text-sm text-ink-mute">Last updated: {updated}. These terms are a draft and will change before launch.</p>
        <div className="mt-10 prose-ekoa">
          <p className="text-ink">These terms govern your use of the Ekoa platform and website at ekoa-framework.org. By using Ekoa, you agree to these terms. Schools that join Ekoa also agree to the school agreement and safeguarding requirements described below.</p>

          <h2>1. Who can use Ekoa</h2>
          <p>Ekoa connects schools and student sustainability leaders. Accounts are created by a school's faculty liaison or by an Ekoa steward — they are not self-service. You may use Ekoa only if:</p>
          <ul>
            <li>you are invited by your school or by Ekoa;</li>
            <li>you are a student under 18 and a parent or guardian has given consent for your account; or</li>
            <li>you are an adult acting for a school or organisation that has agreed to these terms.</li>
          </ul>
          <p>You must provide accurate information and keep your sign-in details secure. You are responsible for everything done through your account.</p>

          <h2>2. Schools</h2>
          <p>Schools that join Ekoa agree to:</p>
          <ul>
            <li>name a faculty liaison who owns the school's workspace and keeps its record across student cohorts;</li>
            <li>get guardian consent for student members under 18 before their accounts are used;</li>
            <li>follow safeguarding requirements, including ensuring adults who work with students complete the background checks and code of conduct that apply in their country; and</li>
            <li>use the platform lawfully and not put students at risk.</li>
          </ul>
          <p>Schools own the data of their own members and projects. Ekoa may publish anonymised records where the school has agreed, and may use the data to run the network as described in the privacy policy.</p>

          <h2>3. Acceptable use</h2>
          <p>You agree not to misuse Ekoa. In particular, you will not:</p>
          <ul>
            <li>post another person's personal data, phone numbers, email addresses or social handles in public or member spaces;</li>
            <li>use the platform to harass, bully, threaten or impersonate anyone;</li>
            <li>contact other members outside the platform's approved group spaces;</li>
            <li>try to access another school's data or accounts you are not authorised to use;</li>
            <li>disrupt the platform, overload it, or attempt to break its security;</li>
            <li>use Ekoa for anything unlawful, or to infringe anyone's rights.</li>
          </ul>
          <p>Content that breaks these rules may be removed, and accounts may be suspended or closed.</p>

          <h2>4. Your content</h2>
          <p>You keep the rights to the content you create on Ekoa. You give Ekoa and the schools you work with a limited licence to store, display and use that content to operate the platform, including publishing anonymised records in the public Library. You are responsible for the content you post and confirm you have the right to post it.</p>

          <h2>5. Our intellectual property</h2>
          <p>The Ekoa name, logo and the platform itself belong to the Ekoa Stewards organisation and its licensors. You may not copy, resell or use them without permission, except to use the platform as these terms allow.</p>

          <h2>6. The service "as is"</h2>
          <p>Ekoa is provided "as is" and "as available". We do not promise that the platform will always work or be error-free, and we give no warranties beyond what the law requires. Ekoa is an educational network, not a provider of professional advice.</p>

          <h2>7. Limitation of liability</h2>
          <p>To the maximum extent the law allows, the Ekoa Stewards organisation is not liable for any indirect or consequential loss, or for loss of data or profits, arising from your use of Ekoa. Our total liability for any claim is limited to the amount you paid to use Ekoa in the previous twelve months, or one hundred US dollars, whichever is greater. Nothing in these terms limits liability that cannot be limited by law.</p>

          <h2>8. Indemnity</h2>
          <p>You agree to indemnify the Ekoa Stewards organisation and its stewards from claims, losses and costs arising from your breach of these terms, your misuse of the platform, or your content.</p>

          <h2>9. Suspension and termination</h2>
          <p>We may suspend or close an account, remove content, or restrict access if we reasonably believe these terms have been broken, or where we have to protect a student or comply with the law. You can stop using Ekoa at any time. When an account closes, the school or the person can ask for their data, which we handle as described in the privacy policy.</p>

          <h2>10. Changes to these terms</h2>
          <p>We may update these terms as the platform grows. We will update the date above and, where practical, let schools and members know about material changes. Continued use after a change means you accept the updated terms.</p>

          <h2>11. Law and disputes</h2>
          <p>These terms are governed by the laws of India, without regard to its conflict-of-law rules. Disputes will be subject to the exclusive jurisdiction of the courts of Faridabad, India, unless the law where you live requires otherwise. Where local law gives you rights we cannot remove, those rights stay.</p>

          <h2>12. Contact</h2>
          <p>Questions about these terms? Email {config.contactEmail}.</p>
        </div>
      </div>
    </div>
  );
}
