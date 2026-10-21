import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { supabase } from '@/lib/db';
import { Button, ErrorNote, Field, Input, Notice } from '@/components/ui';

export default function SignIn() {
  const auth = useAuth();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const act = useAction();

  if (!auth.loading && auth.person) return <Navigate to={loc.state?.from ?? '/app'} replace />;

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-4xl">Sign in</h1>
      <p className="mt-2 text-ink-soft">We email you a one-time sign-in link. Accounts are created by your school’s faculty liaison, so use the email your school gave Ekoa.</p>
      <OrphanNotice />
      {sent ? (
        <div className="mt-6"><Notice tone="leaf">Check {email} for your sign-in link. It works once and expires in an hour.</Notice></div>
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

/** Shown when someone signs in with an email no school has invited yet. */
function OrphanNotice() {
  const auth = useAuth();
  const { data } = useData(async () => (await supabase.auth.getUser()).data.user?.email ?? null);
  if (!data || auth.person || auth.loading) return null;
  return (
    <div className="mt-4 space-y-3">
      <Notice tone="clay">You are signed in as {data}, but no school has invited this email yet. Ask your faculty liaison to add you, then sign in again.</Notice>
      <Button variant="ghost" size="sm" onClick={() => void auth.signOut()}>Sign out</Button>
    </div>
  );
}
