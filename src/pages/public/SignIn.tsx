import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listAllRoles, listOrgs, listPeople } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { roleTitle } from '@/lib/ekoa';
import { resetDemo } from '@/lib/demoStore';
import { useAction, useData } from '@/lib/hooks';
import { supabase } from '@/lib/db';
import { Avatar, Badge, Button, ErrorNote, Field, Input, Loading, Notice } from '@/components/ui';

const SHOWS: Record<string, string> = {
  project_lead: 'Leads the school’s projects, under the school’s own title, and signs Identify and Implement gates.',
  ekoa_rep: 'Finds models in the library, joins circles and twins.',
  implementation_team: 'Logs measurements and works on tasks.',
  faculty_liaison: 'The one adult a school needs: verifies data, can sign every gate, owns the workspace.',
  approver: 'Decides on proposals in the approval chain.',
  steward: 'Applications, school health, moderation and safeguarding.',
  partner: 'Verification requests and partner help threads.',
  auditor: 'Peer-audits other schools’ records for tier T3 from the Audit desk.',
  board_member: 'Holds a staggered board seat; incoming Project Lead.',
};

export default function SignIn() {
  const auth = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const act = useAction();
  const { data } = useData(async () => {
    if (!config.isDemo) return null;
    const [people, roles, orgs] = await Promise.all([listPeople(), listAllRoles(), listOrgs()]);
    return { people, roles, orgs };
  });

  const go = async (id: string) => {
    await auth.signInAs(id);
    nav(loc.state?.from ?? '/app');
  };

  if (!config.isDemo) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-ink-soft">We email you a one-time sign-in link. Accounts are created by your school’s faculty liaison.</p>
        <OrphanNotice />
        {sent ? (
          <Notice tone="leaf">Check {email} for your sign-in link. It works once and expires in an hour.</Notice>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); void act.run(async () => { await auth.sendMagicLink(email.trim().toLowerCase()); setSent(true); }); }}>
            <Field label="School email" id="si-email"><Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
            <ErrorNote>{act.error}</ErrorNote>
            <Button type="submit" variant="dark" busy={act.busy} className="w-full">Email me a sign-in link</Button>
          </form>
        )}
      </div>
    );
  }

  const groups = data
    ? data.orgs.map((o) => ({
        org: o,
        people: data.roles
          .filter((r) => r.org_id === o.id && r.status !== 'incoming' && r.role !== 'alumni')
          .map((r) => ({ role: r, person: data.people.find((p) => p.id === r.person_id)! }))
          .filter((x) => x.person),
      })).filter((g) => g.people.length)
    : [];
  const order = ['Aravalli Valley School', 'Ekoa Stewards', 'Compost Commons', 'Ubud Hills Academy', 'Lakeside Secondary', 'Tampines Green Secondary', 'Escola Viva Paulista'];
  groups.sort((a, b) => order.indexOf(a.org.name) - order.indexOf(b.org.name));

  return (
    <div className="mx-auto max-w-page px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold sm:text-4xl">Try the platform as anyone in the pilot</h1>
        <p className="mt-3 text-ink-soft">This is demo mode: every school and person is fictional, and changes are saved only in this browser. Pick a person to see what their role can do. Once Supabase is connected, this page becomes an email sign-in.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { resetDemo(); window.location.reload(); }}>Reset demo data</Button>
          {auth.person && <span className="text-sm text-ink-mute">Signed in as {auth.person.display_name}</span>}
        </div>
      </div>
      {!data ? (
        <Loading />
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <section key={g.org.id} className="rounded-panel border border-paper-line bg-white p-5">
              <h2 className="font-display text-lg font-semibold">{g.org.name}</h2>
              <p className="text-sm text-ink-mute">{g.org.city}, {g.org.country}</p>
              <ul className="mt-4 space-y-2">
                {g.people.map(({ person, role }) => (
                  <li key={role.id}>
                    <button onClick={() => void go(person.id)} className="flex w-full items-start gap-3 rounded-field border border-paper-line p-3 text-left hover:border-ink/40">
                      <Avatar name={person.display_name} tone={person.is_minor ? 'leaf' : 'moss'} />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 font-bold text-ink">
                          {person.display_name}
                          {person.consent_status === 'pending' && <Badge tone="clay">Waiting for consent</Badge>}
                        </span>
                        <span className="block text-sm text-ink-soft">{roleTitle(role)}{person.is_minor ? `, age ${person.age_band}` : ''}</span>
                        <span className="block text-xs text-ink-mute">{SHOWS[role.role]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Shown when someone signs in with an email no school has invited yet. */
function OrphanNotice() {
  const auth = useAuth();
  const { data } = useData(async () => (supabase ? (await supabase.auth.getUser()).data.user?.email ?? null : null));
  if (!data || auth.person || auth.loading) return null;
  return (
    <div className="mt-4 space-y-3">
      <Notice tone="clay">You are signed in as {data}, but no school has invited this email yet. Ask your faculty liaison to add you, then sign in again.</Notice>
      <Button variant="ghost" size="sm" onClick={() => void auth.signOut()}>Sign out</Button>
    </div>
  );
}
