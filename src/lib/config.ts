// Runtime configuration. With no Supabase keys the app runs in demo mode on seeded data.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const forceDemo = (import.meta.env.VITE_DEMO as string | undefined) === 'true';

export const config = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  isDemo: forceDemo || !url || !anonKey,
  contactEmail: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? 'hello@ekoagsin.org',
  termsVersion: '2026-10',
};
