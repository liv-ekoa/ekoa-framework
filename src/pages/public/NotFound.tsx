import { LinkButton } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="hand-note text-3xl">Nothing filed here.</p>
      <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink-soft">The link may be old, or the record may be shared with members only.</p>
      <LinkButton to="/" variant="dark" className="mt-6">Go to the home page</LinkButton>
    </div>
  );
}
