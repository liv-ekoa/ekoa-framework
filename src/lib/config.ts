// Preview branch: the app always runs on fictional schools and people held in the browser.
// It never connects to the real Ekoa database, whatever environment variables are set.
export const config = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  isDemo: true,
  contactEmail: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? 'hello@ekoagsin.org',
  termsVersion: '2026-10',
};
