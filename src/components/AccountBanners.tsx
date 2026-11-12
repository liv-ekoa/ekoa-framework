import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { listConsents, myJoinRequests } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { Button, Notice } from './ui';

/** Notes shown above every app page until the account is fully set up. */
export function AccountBanners() {
  const auth = useAuth();
  const [copied, setCopied] = useState(false);
  const person = auth.person;
  const waitingForGuardian = !!person?.is_minor && person.consent_status === 'pending';
  const { data } = useData(async () => {
    if (!person) return { link: null as string | null, joinPending: false };
    const [consents, joins] = await Promise.all([waitingForGuardian ? listConsents() : Promise.resolve([]), myJoinRequests().catch(() => [])]);
    const c = consents.find((x) => x.person_id === person.id && !x.granted_at);
    return { link: c ? `${window.location.origin}/consent/${c.token}` : null, joinPending: joins.length > 0 };
  }, [person?.id, person?.consent_status]);

  if (!person) return null;
  const link = data?.link ?? null;
  const expired = waitingForGuardian && !person.draft_until && Date.now() > new Date(person.created_at).getTime() + 30 * 86400000;
  const message = `Hi, I'm joining Ekoa, a student sustainability network. Please open this link to give your consent: ${link}`;
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ }
  };
  const share = async () => {
    if (!link) return;
    try { if (navigator.share) { await navigator.share({ title: 'Ekoa guardian consent', text: message }); return; } } catch { /* cancelled */ }
    await copy();
  };
  const hasSchool = auth.orgs.some((o) => o.org_type === 'school');

  return (
    <div className="space-y-3 pb-4">
      {waitingForGuardian && (
        <Notice tone="clay">
          <p className="font-bold">{expired ? 'Your account is paused until a guardian gives consent.' : 'Ask a guardian for consent.'}</p>
          <p className="mt-1 text-sm">{expired ? 'Your work is saved. Send them the consent link and everything comes back.' : 'You can start drafting now. Publishing, photos of people and messaging other schools unlock when they give consent.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="dark" size="sm" disabled={!link} onClick={() => void share()}><Share2 className="h-4 w-4" /> Share consent link</Button>
            <Button variant="ghost" size="sm" disabled={!link} onClick={() => void copy()}>{copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy link</>}</Button>
          </div>
        </Notice>
      )}
      {!hasSchool && !data?.joinPending && person.consent_status !== 'withdrawn' && auth.activeOrg?.org_type === 'independent' && (
        <Notice tone="sky">You are working on your own. <Link className="font-bold underline" to="/welcome?join=1">Join your school</Link> so a teacher can see your work and you can team up with classmates.</Notice>
      )}
      {data?.joinPending && <Notice tone="sky">Your request to join a school is waiting for a teacher to confirm it.</Notice>}
    </div>
  );
}
