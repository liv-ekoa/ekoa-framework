import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { Button, Notice } from '@/components/ui';

export default function WaitingConsent() {
  const auth = useAuth();
  const independent = auth.orgs.some((o) => o.org_type === 'independent') || auth.roles.some((r) => r.local_title === 'Independent student');
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="text-3xl font-bold">Your account is waiting for a parent or guardian</h1>
      <p className="mt-3 text-ink-soft">Because you are under 18, a parent or guardian needs to give consent before your account opens. {independent ? 'We have emailed them a link.' : 'Your school has sent them a link.'}</p>
      <div className="mt-6"><Notice tone="clay">{independent ? `If the link has not arrived, ask them to check their spam folder, or write to ${config.contactEmail} and we will send it again.` : 'Ask your faculty liaison to resend the link if it has not arrived.'} Your account opens as soon as consent is saved.</Notice></div>
      <Button variant="ghost" className="mt-6" onClick={() => void auth.signOut()}>Sign out</Button>
    </div>
  );
}
