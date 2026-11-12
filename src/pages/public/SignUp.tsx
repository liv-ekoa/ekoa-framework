import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, School } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { Button, ErrorNote, Field, Input, Notice, cx } from '@/components/ui';

type Kind = 'student' | 'school';

export default function SignUp() {
  const auth = useAuth();
  const [params] = useSearchParams();
  const [kind, setKind] = useState<Kind>(params.get('as') === 'school' ? 'school' : 'student');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const act = useAction();

  if (!auth.loading && auth.person) return <Navigate to="/app" replace />;
  if (!auth.loading && auth.authEmail) return <Navigate to={`/welcome?as=${kind}`} replace />;

  const options: { key: Kind; title: string; text: string; icon: typeof School }[] = [
    { key: 'student', title: 'I’m a student', text: 'Start your own project now. Add classmates and a teacher whenever you like.', icon: GraduationCap },
    { key: 'school', title: 'I’m a teacher or school', text: 'Set up your school and bring your eco club or student council.', icon: School },
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-4xl">Sign up</h1>
      <p className="mt-2 text-ink-soft">One step. We email you a link, and you’re in. No application, no waiting.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="I am signing up as">
        {options.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={kind === o.key} onClick={() => setKind(o.key)}
            className={cx('rounded-panel border p-4 text-left transition-colors', kind === o.key ? 'border-leaf bg-leaf-50' : 'border-paper-line bg-white hover:border-ink/30')}>
            <o.icon className="h-6 w-6 text-moss" aria-hidden />
            <span className="mt-2 block font-bold text-ink">{o.title}</span>
            <span className="mt-1 block text-sm text-ink-soft">{o.text}</span>
          </button>
        ))}
      </div>
      {sent ? (
        <div className="mt-6"><Notice tone="leaf">Check {email} for your link. It works once and expires in an hour. Open it on this device to finish setting up.</Notice></div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); void act.run(async () => { await auth.sendMagicLink(email.trim().toLowerCase(), `/welcome?as=${kind}`); setSent(true); }); }}>
          <Field label="Your email" id="su-email" hint={kind === 'student' ? 'A personal or school email both work.' : undefined}>
            <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </Field>
          <ErrorNote>{act.error}</ErrorNote>
          <Button type="submit" variant="dark" size="lg" busy={act.busy} className="w-full">Email me a link</Button>
        </form>
      )}
      <p className="mt-6 text-sm text-ink-mute">Already have an account? <Link to="/signin" className="font-bold text-leaf-600 underline">Sign in</Link></p>
    </div>
  );
}
