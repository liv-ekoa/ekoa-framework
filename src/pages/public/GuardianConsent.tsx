import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { grantConsent, lookupConsent } from '@/lib/api';
import { useAction, useData } from '@/lib/hooks';
import { Button, Checkbox, Empty, ErrorNote, Field, Input, Loading, Notice } from '@/components/ui';

export default function GuardianConsent() {
  const { token } = useParams();
  const { data, loading } = useData(() => lookupConsent(token!), [token]);
  const [name, setName] = useState('');
  const [scope, setScope] = useState({ account: true, cross_school: true, photos: false, name_on_records: false });
  const [done, setDone] = useState(false);
  const act = useAction();

  if (loading) return <div className="mx-auto max-w-xl p-10"><Loading /></div>;
  if (!data) return <div className="mx-auto max-w-xl px-4 py-20"><Empty title="This consent link is not valid">Ask your child’s school to send a new link.</Empty></div>;
  const first = data.firstName;

  if (done)
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <Notice tone="leaf">Thank you. Your choices are saved, and {first}’s account is {scope.account ? 'now active' : 'still switched off'}. You can change or withdraw consent at any time by writing to the school or to Ekoa.</Notice>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold">Consent for {first} to use Ekoa</h1>
      <p className="mt-3 text-ink-soft">{first}’s school has invited them to take part in a student sustainability network. Their account stays switched off until you decide. Choose exactly what you allow.</p>
      <div className="mt-6 space-y-3 rounded-panel border border-paper-line bg-white p-6 text-sm text-ink-soft">
        <p className="font-bold text-ink">What we store about {first}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Name, school email and an age band (never a date of birth).</li>
          <li>The project work, measurements and posts they add.</li>
        </ul>
        <p className="font-bold text-ink">How we protect them</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Adults never message students one-to-one; teachers can see every shared space.</li>
          <li>Contact details posted in shared spaces are blocked automatically.</li>
          <li>No advertising, no tracking, no location data.</li>
        </ul>
      </div>
      <div className="mt-6 space-y-4">
        <Checkbox checked={scope.account} onChange={(v) => setScope({ ...scope, account: v })} label={`Allow ${first} to have an account`} hint="Required to take part. Without it, nothing else applies." />
        <Checkbox checked={scope.cross_school} disabled={!scope.account} onChange={(v) => setScope({ ...scope, cross_school: v })} label="Allow moderated circles with students from other schools" hint="Group threads only, with teachers visible." />
        <Checkbox checked={scope.photos} disabled={!scope.account} onChange={(v) => setScope({ ...scope, photos: v })} label={`Allow photos where ${first} can be identified`} hint="Off by default. Most evidence photos show bins and sites, not people." />
        <Checkbox checked={scope.name_on_records} disabled={!scope.account} onChange={(v) => setScope({ ...scope, name_on_records: v })} label={`Allow ${first}’s name on published records`} hint="Off by default. Records list contributors by role." />
      </div>
      <div className="mt-6 max-w-sm">
        <Field label="Your full name" id="gc-name"><Input id="gc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
      </div>
      <div className="mt-6 space-y-3">
        <ErrorNote>{act.error}</ErrorNote>
        <Button variant="dark" size="lg" busy={act.busy} onClick={() => act.run(async () => { if (name.trim().length < 3) throw new Error('Type your full name to confirm.'); await grantConsent(token!, name.trim(), scope); setDone(true); })}>
          Save my choices
        </Button>
      </div>
    </div>
  );
}
