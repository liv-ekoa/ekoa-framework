import { useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { School, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { supabase } from '@/lib/db';
import { Button, ErrorNote, Field, Input, LinkButton, Notice, cx } from '@/components/ui';

type Mode = 'school' | 'student';

export default function SignIn() {
  const auth = useAuth();
  const loc = useLocation() as { state?: { from?: string } };
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get('as') === 'student' ? 'student' : 'school');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const act = useAction();
  const googleAct = useAction();
  // Independent students land on the sign-up form after the link; it sends them on if they already have an account.
  const next = mode === 'student' ? '/join/student' : '/app';

  const continueWithGoogle = () =>
    googleAct.run(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${next}` },
      });
      if (error) throw new Error(error.message);
    });

  if (!auth.loading && auth.person) return <Navigate to={loc.state?.from ?? '/app'} replace />;

  const choose = (m: Mode) => { setMode(m); setSent(false); act.setError(null); };
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-4xl">Sign in</h1>
      <p className="mt-2 text-ink-soft">Choose how you use Ekoa. We email you a one-time sign-in link, or you can use Google.</p>
      <OrphanNotice />
      <div role="radiogroup" aria-label="How do you use Ekoa?" className="mt-6 grid gap-3 sm:grid-cols-2">
        <ModeCard active={mode === 'school'} onClick={() => choose('school')} icon={<School className="h-5 w-5" aria-hidden />} title="Sign in as a school" body="Students, teachers and staff whose school is on Ekoa." />
        <ModeCard active={mode === 'student'} onClick={() => choose('student')} icon={<UserRound className="h-5 w-5" aria-hidden />} title="Independent student" body="Join on your own, before your school is on Ekoa." />
      </div>

      <div className="mt-6 rounded-panel border border-paper-line bg-white p-5">
        {mode === 'school' ? (
          <p className="text-sm text-ink-soft">Use the email your school gave Ekoa. Your school’s faculty liaison or the Ekoa team adds you. Is your school not on Ekoa yet? <Link to="/join" className="font-bold text-leaf-600 underline">Register your school</Link>.</p>
        ) : (
          <p className="text-sm text-ink-soft">You get your own private workspace to plan projects and log measurements, without waiting for your school. When your school joins, the Ekoa team can move your projects to it. Under 18? A parent or guardian gives consent first. Already joined? Sign in here with the same email.</p>
        )}
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
            <Field label={mode === 'school' ? 'School email' : 'Your email'} id="si-email"><Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
            <ErrorNote>{act.error}</ErrorNote>
            <Button type="submit" variant="dark" busy={act.busy} className="w-full">{mode === 'school' ? 'Email me a sign-in link' : 'Email me a link to join'}</Button>
          </form>
        )}
      </div>
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, body }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; body: string }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick} className={cx('flex items-start gap-3 rounded-panel border p-4 text-left transition-colors', active ? 'border-moss bg-moss/5 ring-1 ring-moss' : 'border-paper-line bg-white hover:border-ink/30')}>
      <span className={cx('rounded-field p-2', active ? 'bg-moss text-paper' : 'bg-paper-deep text-ink-soft')}>{icon}</span>
      <span><span className="block font-bold">{title}</span><span className="text-sm text-ink-soft">{body}</span></span>
    </button>
  );
}

/** Shown when someone signs in with an email no school has added yet. */
function OrphanNotice() {
  const auth = useAuth();
  if (!auth.authEmail || auth.person || auth.loading) return null;
  return (
    <div className="mt-4 space-y-3">
      <Notice tone="clay">You are signed in as {auth.authEmail}, but no school has added this email yet. You can join as an independent student now, or ask your faculty liaison to add you.</Notice>
      <div className="flex flex-wrap gap-2">
        <LinkButton to="/join/student" size="sm" variant="dark">Join as an independent student</LinkButton>
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
