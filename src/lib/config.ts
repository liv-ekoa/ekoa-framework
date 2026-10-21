// Runtime configuration, set at build time. The site needs its Supabase project URL and
// public (anon) key; both are safe to ship in the browser because row-level security in
// the database decides what each visitor can see.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const config = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  /** False when the build was made without the database settings. */
  configured: !!url && !!anonKey,
  contactEmail: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? 'hello@ekoagsin.org',
  termsVersion: '2026-10',
};
