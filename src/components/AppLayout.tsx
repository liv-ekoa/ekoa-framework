import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpenText, ChevronDown, ClipboardCheck, ClipboardList, FileBarChart, Gauge, HandHelping, Home, Landmark, LogOut, Menu, Network,
  PiggyBank, Plus, Repeat2, School, Settings, ShieldCheck, Trophy, Users, X,
} from 'lucide-react';
import { Logo } from './Logo';
import { ReportConcern } from './ReportConcern';
import { useAuth } from '@/lib/auth';
import { roleTitle } from '@/lib/ekoa';
import { Avatar, Loading, cx } from './ui';

type Auth = ReturnType<typeof useAuth>;
interface NavItem { to: string; label: string; icon: typeof Gauge; end?: boolean; show: (a: Auth) => boolean }

const inSchool = (a: Auth) => a.activeOrg?.org_type === 'school';
const auditor = (a: Auth) => !!a.activeOrg?.audit_school && a.has(['auditor', 'faculty_liaison']);

// The main tabs follow the Villars layout: Home, your profile (My school), the Wall and Connections.
const TABS: NavItem[] = [
  { to: '/app', label: 'Home', icon: Home, end: true, show: () => true },
  { to: '/app/projects', label: 'Projects', icon: ClipboardList, show: inSchool },
  { to: '/app/school', label: 'My school', icon: School, show: inSchool },
  { to: '/app/network', label: 'Wall', icon: Users, show: () => true },
  { to: '/app/connections', label: 'Connections', icon: Network, show: () => true },
  { to: '/app/library', label: 'Library', icon: BookOpenText, show: () => true },
];
const MORE: NavItem[] = [
  { to: '/app/audit', label: 'Audit desk', icon: ClipboardCheck, show: auditor },
  { to: '/app/funding', label: 'Fund your project', icon: PiggyBank, show: inSchool },
  { to: '/app/metrics', label: 'Metrics', icon: Gauge, show: inSchool },
  { to: '/app/governance', label: 'Governance', icon: Landmark, show: inSchool },
  { to: '/app/handover', label: 'Handover', icon: Repeat2, show: inSchool },
  { to: '/app/reports', label: 'Reports', icon: FileBarChart, show: (a) => inSchool(a) || a.isSteward },
  { to: '/ranking', label: 'School ranking', icon: Trophy, show: () => true },
  { to: '/app/steward', label: 'Steward console', icon: ShieldCheck, show: (a) => a.isSteward },
  { to: '/app/partner', label: 'Partner desk', icon: HandHelping, show: (a) => a.isPartner },
  { to: '/app/settings', label: 'Settings', icon: Settings, show: () => true },
];

function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);
  return ref;
}

export function AppLayout() {
  const auth = useAuth();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [more, setMore] = useState(false);
  const [me, setMe] = useState(false);
  const moreRef = useOutside<HTMLDivElement>(more, () => setMore(false));
  const meRef = useOutside<HTMLDivElement>(me, () => setMe(false));
  useEffect(() => { setDrawer(false); setMore(false); setMe(false); }, [loc.pathname]);

  if (auth.loading) return <div className="p-10"><Loading /></div>;
  if (!auth.person) return <Navigate to="/signin" replace state={{ from: loc.pathname }} />;
  if (auth.needsConsent) return <Navigate to="/waiting-for-consent" replace />;

  const tabs = TABS.filter((n) => n.show(auth));
  const moreItems = MORE.filter((n) => n.show(auth));
  const myRoles = auth.roles.filter((r) => r.org_id === auth.activeOrg?.id && r.status !== 'incoming').map((r) => roleTitle(r));
  const canLog = inSchool(auth) && auth.has(['implementation_team', 'project_lead', 'board_member', 'ekoa_rep', 'faculty_liaison']);
  const moreActive = moreItems.some((n) => loc.pathname.startsWith(n.to));

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cx('relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-4 text-sm font-bold transition-colors',
      isActive ? 'text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-full after:bg-clay' : 'text-ink-mute hover:text-ink');

  const orgSwitch = auth.orgs.length > 1 && (
    <label className="block text-xs text-ink-mute">
      <span className="sr-only">Working in</span>
      <select value={auth.activeOrg?.id} onChange={(e) => auth.setActiveOrg(e.target.value)} className="max-w-[14rem] truncate rounded-full border border-paper-line bg-white px-3 py-1.5 text-sm font-bold text-ink">
        {auth.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );

  const drawerList = (
    <nav aria-label="App" className="space-y-0.5">
      {[...tabs, ...moreItems].map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-bold', isActive ? 'bg-moss text-paper' : 'text-ink hover:bg-paper-deep')}>
          <n.icon className="h-[18px] w-[18px]" aria-hidden /> {n.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <a href="#app-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-field focus:bg-white focus:px-3 focus:py-2">Skip to content</a>

      <header className="no-print sticky top-0 z-40 border-b border-paper-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Public site" className="shrink-0 py-3"><Logo compact /></Link>
          <nav aria-label="App" className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            {tabs.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={tabClass}>{n.label}</NavLink>)}
            <div ref={moreRef} className="relative">
              <button onClick={() => setMore((m) => !m)} aria-expanded={more} aria-haspopup="menu" className={cx('relative inline-flex items-center gap-1 px-3 py-4 text-sm font-bold', moreActive ? 'text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-full after:bg-clay' : 'text-ink-mute hover:text-ink')}>
                More <ChevronDown className={cx('h-4 w-4 transition-transform', more && 'rotate-180')} aria-hidden />
              </button>
              {more && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-60 rounded-panel border border-paper-line bg-white p-2 shadow-lg">
                  {moreItems.map((n) => (
                    <NavLink key={n.to} to={n.to} role="menuitem" className={({ isActive }) => cx('flex items-center gap-3 rounded-field px-3 py-2 text-sm font-bold', isActive ? 'bg-paper-deep text-ink' : 'text-ink-soft hover:bg-paper hover:text-ink')}>
                      <n.icon className="h-4 w-4" aria-hidden /> {n.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {orgSwitch}
            {canLog && (
              <Link to="/app/log" className="inline-flex items-center gap-1.5 rounded-full bg-clay-600 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-clay-700">
                <Plus className="h-4 w-4" aria-hidden /> Log
              </Link>
            )}
            <div ref={meRef} className="relative">
              <button onClick={() => setMe((m) => !m)} aria-expanded={me} aria-haspopup="menu" className="flex items-center gap-2 rounded-full border border-paper-line bg-white py-1 pl-1 pr-2.5 hover:border-ink/30">
                <Avatar name={auth.person.display_name} tone="moss" />
                <ChevronDown className="h-4 w-4 text-ink-mute" aria-hidden />
                <span className="sr-only">Your account</span>
              </button>
              {me && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 space-y-3 rounded-panel border border-paper-line bg-white p-4 shadow-lg">
                  <div>
                    <p className="font-bold">{auth.person.display_name}</p>
                    <p className="text-xs text-ink-mute">{myRoles.join(', ') || 'Member'}{auth.activeOrg ? ` · ${auth.activeOrg.name}` : ''}</p>
                  </div>
                  <ReportConcern />
                  <button onClick={() => void auth.signOut()} className="flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setDrawer(true)} className="ml-auto rounded-field p-2 lg:hidden" aria-label="Open menu"><Menu /></button>
        </div>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex w-[84%] max-w-xs flex-col gap-5 overflow-y-auto bg-paper px-3 py-5">
            <div className="flex items-center justify-between px-2"><Logo compact /><button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-field p-1"><X /></button></div>
            {orgSwitch && <div className="px-2">{orgSwitch}</div>}
            {drawerList}
            <div className="space-y-3 border-t border-paper-line px-2 pt-4">
              <div className="flex items-center gap-2.5">
                <Avatar name={auth.person.display_name} tone="moss" />
                <div className="min-w-0"><p className="truncate text-sm font-bold">{auth.person.display_name}</p><p className="truncate text-xs text-ink-mute">{myRoles.join(', ') || 'Member'}</p></div>
              </div>
              <ReportConcern />
              <button onClick={() => void auth.signOut()} className="flex items-center gap-1.5 text-sm font-bold text-ink-soft"><LogOut className="h-4 w-4" /> Sign out</button>
            </div>
          </div>
          <button className="flex-1 bg-ink/40" onClick={() => setDrawer(false)} aria-label="Close menu" />
        </div>
      )}

      <main id="app-main" className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-6 lg:pb-14">
        <Outlet />
      </main>

      {/* Mobile bottom bar */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-paper-line bg-white lg:hidden" aria-label="Quick">
        {[
          { to: '/app', label: 'Home', icon: Home, end: true },
          { to: '/app/network', label: 'Wall', icon: Users },
        ].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold', isActive ? 'text-clay-700' : 'text-ink-mute')}>
            <n.icon className="h-5 w-5" aria-hidden />{n.label}
          </NavLink>
        ))}
        <Link to={canLog ? '/app/log' : '/app/library'} className="-mt-4 flex flex-col items-center justify-center" aria-label={canLog ? 'Log a measurement' : 'Library'}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-600 text-white shadow-md">{canLog ? <Plus className="h-6 w-6" /> : <BookOpenText className="h-6 w-6" />}</span>
        </Link>
        <NavLink to="/app/connections" className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold', isActive ? 'text-clay-700' : 'text-ink-mute')}>
          <Network className="h-5 w-5" aria-hidden />Connections
        </NavLink>
        <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold text-ink-mute">
          <Menu className="h-5 w-5" aria-hidden />More
        </button>
      </nav>
    </div>
  );
}
