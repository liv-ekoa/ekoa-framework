import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { registerIndependentStudent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { ALL_COUNTRIES } from '@/lib/funding';
import type { Person } from '@/lib/types';
import { Button, ErrorNote, Field, Input, Loading, Notice, Select } from '@/components/ui';

/** A student joins Ekoa without their school. They lead their own projects in a private workspace
 *  until an Ekoa admin assigns them to their school. Under-18s wait for a guardian's consent. */
export default function JoinStudent() {
  const auth = useAuth();
  const nav = useNavigate();
  const act = useAction();
  const [f, setF] = useState({ name: '', age_band: '' as Person['age_band'] | '', school: '', country: '', city: '', guardian_name: '', guardian_email: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const minor = f.age_band !== '' && f.age_band !== '18+';

  if (auth.loading) return <div className="p-10"><Loading /></div>;
  if (auth.person) return <Navigate to="/app" replace />;
  if (!auth.authEmail) return <Navigate to="/signin?as=student" replace />;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-4xl">Join as an independent student</h1>
      <p className="mt-2 text-ink-soft">You are signing up as {auth.authEmail}. You get a private workspace for your own projects. Nobody outside it sees your work until your school joins Ekoa and an Ekoa admin moves you there.</p>
      <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); void act.run(async () => {
        if (!f.age_band) throw new Error('Choose your age group.');
        await registerIndependentStudent({ ...f, age_band: f.age_band });
        await auth.refresh();
        nav(minor ? '/waiting-for-consent' : '/app', { replace: true });
      }); }}>
        <Field label="Your name" id="js-n" hint="The name others in Ekoa will see. A first name is fine."><Input id="js-n" value={f.name} onChange={set('name')} autoComplete="name" required /></Field>
        <Field label="Age group" id="js-a">
          <Select id="js-a" value={f.age_band} onChange={set('age_band')} required>
            <option value="">Choose</option><option value="13-15">13 to 15</option><option value="16-17">16 or 17</option><option value="18+">18 or over</option>
          </Select>
        </Field>
        <Field label="Your school" id="js-s" hint="So we can connect you when your school joins Ekoa."><Input id="js-s" value={f.school} onChange={set('school')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country" id="js-c"><Select id="js-c" value={f.country} onChange={set('country')} required><option value="">Choose</option>{ALL_COUNTRIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="City or town" id="js-ci"><Input id="js-ci" value={f.city} onChange={set('city')} /></Field>
        </div>
        {minor && (
          <div className="space-y-4 rounded-panel border border-clay/40 bg-clay-50/40 p-4">
            <Notice tone="clay">Because you are under 18, we email a parent or guardian for consent. Your account opens as soon as they agree.</Notice>
            <Field label="Parent or guardian’s name" id="js-gn"><Input id="js-gn" value={f.guardian_name} onChange={set('guardian_name')} required /></Field>
            <Field label="Parent or guardian’s email" id="js-ge"><Input id="js-ge" type="email" value={f.guardian_email} onChange={set('guardian_email')} required /></Field>
          </div>
        )}
        <ErrorNote>{act.error}</ErrorNote>
        <Button type="submit" variant="dark" size="lg" busy={act.busy} className="w-full">Create my workspace</Button>
        <p className="text-xs text-ink-mute">Wrong email? <button type="button" className="underline" onClick={() => void auth.signOut()}>Sign out</button> and start again.</p>
      </form>
    </div>
  );
}
