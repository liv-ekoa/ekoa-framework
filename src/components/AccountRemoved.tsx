import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { EkoaMascot } from '@/components/EkoaMascot';
import { Button } from '@/components/ui';

/** Shown instead of the app when an Ekoa admin has removed this account. */
export function AccountRemoved() {
  const auth = useAuth();
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EkoaMascot pose="loading" size={88} className="mb-4 text-moss" />
      <h1 className="text-3xl font-bold">This account has been removed</h1>
      <p className="mt-3 text-ink-soft">An Ekoa admin removed this account, so you can no longer sign in to the app. Your work has not been deleted. If you think this is a mistake, write to <a className="font-bold underline" href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.</p>
      <Button variant="ghost" className="mt-6" onClick={() => void auth.signOut()}>Sign out</Button>
    </div>
  );
}
