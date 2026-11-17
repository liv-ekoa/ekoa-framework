import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { supabase } from '@/lib/db';
import { Button, ErrorNote, Field, Input, LinkButton, Notice } from '@/components/ui';

export default function SignIn() {
  const auth = useAuth();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const act = useAction();
  const googleAct = useAction();
  // New people are sent on to finish setting up; existing ones go straight in.
  const next = '/app';

  const continueWithGoogle = () =>
    googleAct.run(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${next}` },
      });
      if (error) throw new Error(error.message);
    });

  if (!auth.loading && auth.person) return <Navigate to={loc.state?.from ?? '/app'} replace />;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-4xl">Sign in</h1>
      <p className="mt-2 text-ink-soft">Use Google, or we email you a one-time link. New here? <Link to="/signup" className="font-bold text-leaf-600 underline">Sign up</Link>.</p>
      <OrphanNotice />

      <div className="mt-6 rounded-panel border border-paper-line bg-white p-5">
        <Button type="button" variant="ghost" busy={googleAct.busy} onClick={continueWithGoogle} className="mt-4 w-full">
          <GoogleIcon /> Continue with Google
        </Button>
        <ErrorNote>{googleAct.error}</ErrorNote>
        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-ink-mute">
          <span className="h-px flex-1 bg-paper-line" /> or <span className="h-px flex-1 bg-paper-line" />
        </div>
        {sent ? (
          <Notice tone="leaf">Check {email} for your sign-in link. It works once and expires in an hour.</Notice>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void act.run(async () => { await auth.sendMagicLink(email.trim().toLowerCase(), next); setSent(true); }); }}>
            <Field label="Your email" id="si-email"><Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
            <ErrorNote>{act.error}</ErrorNote>
            <Button type="submit" variant="dark" busy={act.busy} className="w-full">Email me a sign-in link</Button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Shown when someone has signed in but not finished setting up. */
function OrphanNotice() {
  const auth = useAuth();
  if (!auth.authEmail || auth.person || auth.loading) return null;
  return (
    <div className="mt-4 space-y-3">
      <Notice tone="clay">You are signed in as {auth.authEmail}, but your account isn’t set up yet. It takes a minute.</Notice>
      <div className="flex flex-wrap gap-2">
        <LinkButton to="/welcome?as=student" size="sm" variant="dark">I’m a student</LinkButton>
        <LinkButton to="/welcome?as=school" size="sm" variant="ghost">I’m a teacher or school</LinkButton>
        <Button variant="ghost" size="sm" onClick={() => void auth.signOut()}>Sign out</Button>
      </div>
    </div>
  );
}

/** Google's multicolor G mark. lucide-react has no brand glyphs, so use the official SVG. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden focusable="false">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}
