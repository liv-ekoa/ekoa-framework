import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { Button, ErrorNote, Field, Input, Notice } from '@/components/ui';

export default function SignIn() {
  const auth = useAuth();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const act = useAction();

  if (!auth.loading && auth.person) return <Navigate to={loc.state?.from ?? '/app'} replace />;
  if (!auth.loading && auth.email) return <Navigate to="/welcome" replace />;

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-4xl">Sign in</h1>
      <p className="mt-2 text-ink-soft">We email you a one-time sign-in link. New here? <Link to="/signup" className="font-bold text-leaf-600 underline">Sign up</Link>.</p>
      {sent ? (
        <div className="mt-6"><Notice tone="leaf">Check {email} for your sign-in link. It works once and expires in an hour.</Notice></div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); void act.run(async () => { await auth.sendMagicLink(email.trim().toLowerCase()); setSent(true); }); }}>
          <Field label="Email" id="si-email"><Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
          <ErrorNote>{act.error}</ErrorNote>
          <Button type="submit" variant="dark" busy={act.busy} className="w-full">Email me a sign-in link</Button>
        </form>
      )}
    </div>
  );
}
