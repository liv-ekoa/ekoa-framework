import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './db';
import { config } from './config';
import { getOrg, listPeople, listRolesForPerson } from './api';
import type { Organisation, Person, RoleAssignment, RoleKey, UUID } from './types';
import { ROLES } from './ekoa';

const DEMO_KEY = 'ekoa-demo-person';
const ORG_KEY = 'ekoa-active-org';

interface AuthState {
  loading: boolean;
  person: Person | null;
  roles: RoleAssignment[];
  orgs: Organisation[];
  activeOrg: Organisation | null;
  setActiveOrg: (id: UUID) => void;
  signInAs: (personId: UUID) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Role checks scoped to the active organisation unless an org id is given. */
  has: (roles: RoleKey | RoleKey[], orgId?: UUID) => boolean;
  isSteward: boolean;
  isPartner: boolean;
  isAdult: boolean;
  needsConsent: boolean;
}

const Ctx = createContext<AuthState | null>(null);

const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<Person | null>(null);
  const [roles, setRoles] = useState<RoleAssignment[]>([]);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<UUID | null>(safeGet(ORG_KEY));

  const loadPerson = useCallback(async (p: Person | null) => {
    if (!p) {
      setPerson(null);
      setRoles([]);
      setOrgs([]);
      return;
    }
    const rs = (await listRolesForPerson(p.id)).filter((r) => r.status !== 'alumni' || r.role === 'alumni');
    const orgIds = [...new Set(rs.map((r) => r.org_id))];
    const os = await Promise.all(orgIds.map((id) => getOrg(id)));
    setPerson(p);
    setRoles(rs);
    setOrgs(os);
    setActiveOrgId((cur) => (cur && orgIds.includes(cur) ? cur : orgIds[0] ?? null));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (config.isDemo) {
        const id = safeGet(DEMO_KEY);
        const people = id ? await listPeople() : [];
        await loadPerson(people.find((p) => p.id === id) ?? null);
      } else if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const { data: p } = await supabase.from('people').select('*').eq('auth_user_id', data.user.id).maybeSingle();
          await loadPerson((p as Person) ?? null);
        } else await loadPerson(null);
      }
    } finally {
      setLoading(false);
    }
  }, [loadPerson]);

  useEffect(() => {
    void refresh();
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(() => void refresh());
      return () => data.subscription.unsubscribe();
    }
  }, [refresh]);

  const value = useMemo<AuthState>(() => {
    const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;
    const current = roles.filter((r) => r.status === 'active' || r.status === 'outgoing');
    const has = (want: RoleKey | RoleKey[], orgId?: UUID) => {
      const list = Array.isArray(want) ? want : [want];
      const scope = orgId ?? activeOrg?.id;
      return current.some((r) => list.includes(r.role) && (!scope || r.org_id === scope));
    };
    return {
      loading,
      person,
      roles,
      orgs,
      activeOrg,
      setActiveOrg: (id) => {
        setActiveOrgId(id);
        safeSet(ORG_KEY, id);
      },
      signInAs: async (personId) => {
        safeSet(DEMO_KEY, personId);
        safeSet(ORG_KEY, null);
        setActiveOrgId(null);
        await refresh();
      },
      sendMagicLink: async (email) => {
        if (!supabase) throw new Error('Sign-in by email works once Supabase is connected. Use a demo account for now.');
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/app`, shouldCreateUser: true } });
        if (error) throw new Error(error.message);
      },
      signOut: async () => {
        safeSet(DEMO_KEY, null);
        if (supabase) await supabase.auth.signOut();
        await loadPerson(null);
      },
      refresh,
      has,
      isSteward: current.some((r) => r.role === 'steward'),
      isPartner: current.some((r) => r.role === 'partner'),
      isAdult: person?.age_band === '18+',
      needsConsent: !!person?.is_minor && person.consent_status !== 'granted',
    };
  }, [loading, person, roles, orgs, activeOrgId, refresh, loadPerson]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

/** Label shown with a post: the author's role and organisation, captured at posting time. */
export function authorMeta(a: Pick<AuthState, 'roles' | 'activeOrg'>) {
  const r = a.roles.find((x) => x.org_id === a.activeOrg?.id && (x.status === 'active' || x.status === 'outgoing'));
  return { role: r ? (r.local_title?.trim() || ROLES[r.role].label) : '', org: a.activeOrg?.name ?? '' };
}
