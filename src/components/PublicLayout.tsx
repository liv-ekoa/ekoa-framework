import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { EkoaLetters } from './Ekoa';
import { ReportConcern } from './ReportConcern';
import { config } from '@/lib/config';
import { useAuth } from '@/lib/auth';
import { cx } from './ui';
import { useEffect } from 'react';

const NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/network', label: 'Network' },
  { to: '/library', label: 'Library' },
  { to: '/ranking', label: 'Ranking' },
  { to: '/reports', label: 'Reports' },
  { to: '/about', label: 'About' },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { person } = useAuth();
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
    if (!loc.hash) {
      window.scrollTo(0, 0);
      return;
    }
    // Pages load lazily, so wait for the anchor to exist before scrolling to it.
    let tries = 0;
    const t = window.setInterval(() => {
      const el = document.getElementById(decodeURIComponent(loc.hash.slice(1)));
      if (el || ++tries > 30) {
        window.clearInterval(t);
        el?.scrollIntoView({ block: 'start' });
      }
    }, 50);
    return () => window.clearInterval(t);
  }, [loc.pathname, loc.hash]);
  return (
    <div className="flex min-h-screen flex-col">
      <p className="bg-clay-700 px-4 py-2 text-center text-xs font-bold text-white sm:text-sm">
        Preview with fictional schools and people. Nothing here is saved to Ekoa. <Link to="/signin" className="underline">Sign in</Link> to step into any role.
      </p>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-field focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-paper-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-page items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Ekoa home"><Logo /></Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('rounded-field px-3 py-2 text-sm font-bold', isActive ? 'text-ink' : 'text-ink-mute hover:text-ink')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Link to={person ? '/app' : '/signin'} className="rounded-field px-3 py-2 text-sm font-bold text-ink-soft hover:text-ink">{person ? 'Open the app' : 'Sign in'}</Link>
            <Link to="/join" className="rounded-full bg-moss px-4 py-2 text-sm font-bold text-paper hover:bg-moss-800">Join the founding cohort</Link>
          </div>
          <button className="rounded-field p-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-paper-line bg-paper px-4 py-3 lg:hidden" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="block rounded-field px-2 py-2.5 font-bold text-ink">{n.label}</Link>
            ))}
            <Link to={person ? '/app' : '/signin'} className="block rounded-field px-2 py-2.5 font-bold text-ink-soft">{person ? 'Open the app' : 'Sign in'}</Link>
            <Link to="/join" className="mt-2 block rounded-full bg-moss px-3 py-2.5 text-center font-bold text-paper">Join the founding cohort</Link>
          </nav>
        )}
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-20 bg-moss text-paper">
        <div className="mx-auto grid max-w-page gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Logo light />
            <p className="max-w-sm text-sm text-paper/85">The implementation network for student-led school sustainability. Built by students, for students.</p>
            <div className="max-w-xs pt-1"><EkoaLetters compact light /></div>
            <ReportConcern light />
          </div>
          <div>
            <h2 className="mb-3 label-caps text-paper">The work</h2>
            <ul className="space-y-2 text-sm text-paper/85">
              <li><Link to="/how-it-works" className="hover:text-paper">How it works</Link></li>
              <li><Link to="/library" className="hover:text-paper">Implementation Library</Link></li>
              <li><Link to="/ranking" className="hover:text-paper">School ranking</Link></li>
              <li><Link to="/reports" className="hover:text-paper">Reports</Link></li>
              <li><Link to="/network" className="hover:text-paper">Network map</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 label-caps text-paper">Get involved</h2>
            <ul className="space-y-2 text-sm text-paper/85">
              <li><Link to="/join" className="hover:text-paper">Join the founding cohort</Link></li>
              <li><Link to="/contact" className="hover:text-paper">Contact</Link></li>
              <li><Link to="/mission" className="hover:text-paper">Mission</Link></li>
              <li><Link to="/about" className="hover:text-paper">About</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 label-caps text-paper">Trust</h2>
            <ul className="space-y-2 text-sm text-paper/85">
              <li><Link to="/safeguarding" className="hover:text-paper">Safeguarding and privacy</Link></li>
              <li><a href={`mailto:${config.contactEmail}`} className="hover:text-paper">{config.contactEmail}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-paper/10">
          <p className="mx-auto max-w-page px-4 py-4 text-xs text-paper/80 sm:px-6">© {new Date().getFullYear()} Ekoa.{config.isDemo && ' This is the preview, with fictional schools and people.'}</p>
        </div>
      </footer>
    </div>
  );
}
