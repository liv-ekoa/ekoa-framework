import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { listConsents } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { EkoaMascot } from '@/components/EkoaMascot';
import { Button, Notice } from '@/components/ui';

export default function WaitingConsent() {
  const auth = useAuth();
  const [copied, setCopied] = useState(false);
  // A student can read their own consent record, so they can pass the link on themselves.
  const { data } = useData(async () => (await listConsents()).find((c) => c.person_id === auth.person?.id) ?? null, [auth.person?.id]);
  const link = data ? `${window.location.origin}/consent/${data.token}` : null;
  const message = `Hi, I'm joining Ekoa, a student sustainability network at my school. Please open this link to give your consent: ${link}`;

  const share = async () => {
    if (!link) return;
    try {
      if (navigator.share) { await navigator.share({ title: 'Ekoa guardian consent', text: message }); return; }
    } catch { /* cancelled: fall through to copy */ }
    await copy();
  };
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EkoaMascot pose="loading" size={88} className="mb-4 text-moss" />
      <h1 className="text-3xl font-bold">One step left: ask a guardian for consent</h1>
      <p className="mt-3 text-ink-soft">Because you are under 18, a guardian needs to give consent before your account opens fully. Send them this link by WhatsApp, text or any app. It opens on their phone, with no account needed.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="dark" size="lg" disabled={!link} onClick={() => void share()}><Share2 className="h-4 w-4" /> Share consent link</Button>
        <Button variant="ghost" size="lg" disabled={!link} onClick={() => void copy()}>{copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy link</>}</Button>
      </div>
      <div className="mt-6"><Notice tone="clay">No email needed. Your account opens as soon as they give consent.</Notice></div>
      <Button variant="ghost" className="mt-6" onClick={() => void auth.signOut()}>Sign out</Button>
    </div>
  );
}
