import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { findSchools, requestToJoinSchool, schoolByCode, signupSchool, signupStudent, type SchoolHit } from '@/lib/api';
import { Button, Checkbox, ErrorNote, Field, Input, Loading, Notice, Select, cx } from '@/components/ui';
import type { Person } from '@/lib/types';

/** Finish setting up after the email link: a name, an age group, and optionally a school. */
export default function Welcome() {
  const auth = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const joinOnly = params.get('join') === '1';
  const kind = params.get('as') === 'school' ? 'school' : 'student';
  const act = useAction();

  const [name, setName] = useState('');
  const [age, setAge] = useState<Person['age_band']>('13-15');
  const [school, setSchool] = useState({ name: '', country: '', city: '', adult: false });
  const [q, setQ] = useState('');
  const [code, setCode] = useState('');
  const [hits, setHits] = useState<SchoolHit[]>([]);
  const [picked, setPicked] = useState<SchoolHit | null>(null);
  const [searched, setSearched] = useState(false);

  if (auth.loading) return <div className="mx-auto max-w-lg p-10"><Loading /></div>;
  if (!auth.authEmail) return <Navigate to="/signup" replace />;
  if (auth.person && !joinOnly) return <Navigate to="/app" replace />;

  const search = () => act.run(async () => {
    const byCode = code.trim() ? await schoolByCode(code.trim()) : [];
    const byName = q.trim().length >= 2 ? await findSchools(q.trim()) : [];
    const list = [...byCode, ...byName.filter((h) => !byCode.some((c) => c.id === h.id))];
    setHits(list);
    setSearched(true);
    if (byCode.length) setPicked(byCode[0]);
  });

  const SchoolStep = (
    <div className="space-y-4 rounded-panel border border-paper-line bg-white p-5">
      <div>
        <h2 className="text-lg font-bold">Your school (optional)</h2>
        <p className="mt-1 text-sm text-ink-soft">Find your school so a teacher can see your work and confirm you. You can skip this and do it later.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="School name" id="w-q"><Input id="w-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing" /></Field>
        <Field label="Or a join code" id="w-code" hint="Your teacher can give you this."><Input id="w-code" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
      </div>
      <Button variant="ghost" size="sm" type="button" busy={act.busy} onClick={() => void search()}>Search</Button>
      {searched && hits.length === 0 && <p className="text-sm text-ink-mute">No school found. Check the spelling, ask your teacher for the join code, or skip for now.</p>}
      {hits.length > 0 && (
        <ul className="space-y-2" role="radiogroup" aria-label="Schools found">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" role="radio" aria-checked={picked?.id === h.id} onClick={() => setPicked(h)}
                className={cx('w-full rounded-field border px-3 py-2 text-left text-sm', picked?.id === h.id ? 'border-leaf bg-leaf-50' : 'border-paper-line hover:border-ink/30')}>
                <span className="font-bold">{h.name}</span> <span className="text-ink-mute">{[h.city, h.country].filter(Boolean).join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked && <p className="text-xs text-ink-mute">A teacher at {picked.name} will be asked to confirm you before you can see anything of the school’s.</p>}
    </div>
  );

  if (joinOnly && auth.person) {
    return (
      <div className="mx-auto max-w-lg space-y-5 px-4 py-14">
        <h1 className="text-3xl">Join your school</h1>
        {SchoolStep}
        <ErrorNote>{act.error}</ErrorNote>
        <Button variant="dark" size="lg" disabled={!picked} busy={act.busy} onClick={() => act.run(async () => { await requestToJoinSchool(picked!.id, code.trim() || undefined); await auth.refresh(); nav('/app'); })}>Ask to join</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-14">
      <h1 className="text-3xl">{kind === 'school' ? 'Set up your school' : 'Welcome to Ekoa'}</h1>
      <p className="text-ink-soft">Signed in as {auth.authEmail}. Two quick details and you’re in.</p>
      <Field label="Your full name" id="w-name"><Input id="w-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
      {kind === 'student' ? (
        <>
          <Field label="Your age" id="w-age"><Select id="w-age" value={age} onChange={(e) => setAge(e.target.value as Person['age_band'])}><option value="13-15">13 to 15</option><option value="16-17">16 to 17</option><option value="18+">18 or over</option></Select></Field>
          {age !== '18+' && <Notice tone="sky">You can start straight away. A guardian will be asked for consent, and some things (publishing, photos of people, messaging other schools) unlock when they give it.</Notice>}
          {SchoolStep}
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="School name" id="w-sn"><Input id="w-sn" value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} /></Field></div>
            <Field label="Country" id="w-sc"><Input id="w-sc" value={school.country} onChange={(e) => setSchool({ ...school, country: e.target.value })} /></Field>
            <Field label="City" id="w-sci"><Input id="w-sci" value={school.city} onChange={(e) => setSchool({ ...school, city: e.target.value })} /></Field>
          </div>
          <Checkbox checked={school.adult} onChange={(v) => setSchool({ ...school, adult: v })} label="I am 18 or over and work at this school" />
          <Notice tone="sky">Your school starts unverified. An Ekoa steward will check it. Meanwhile you get a join code to share, and students you confirm can start working.</Notice>
        </>
      )}
      <ErrorNote>{act.error}</ErrorNote>
      <Button variant="dark" size="lg" busy={act.busy} className="w-full" onClick={() => act.run(async () => {
        if (kind === 'school') {
          if (!school.adult) throw new Error('School accounts are for adults. Students: choose “I’m a student”.');
          await signupSchool(name, school.name, school.country, school.city);
        } else {
          await signupStudent(name, age);
          if (picked) {
            try { await requestToJoinSchool(picked.id, code.trim() || undefined); } catch (e) { await auth.refresh(); throw new Error(`Your account is ready, but we could not send the request: ${e instanceof Error ? e.message : ''} You can try again from the home page.`); }
          }
        }
        await auth.refresh();
        nav('/app');
      })}>{kind === 'school' ? 'Create my school' : 'Start'}</Button>
    </div>
  );
}
