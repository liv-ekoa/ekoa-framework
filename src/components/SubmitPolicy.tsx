import { useState } from 'react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { POLICY_TOPICS } from '@/lib/policyLibrary';
import { Button, ErrorNote, Field, Input, Modal, Notice, Select, Textarea } from './ui';

/** Lets a signed-in member add a policy to the Library. It stays hidden until an Ekoa admin approves it. */
export function SubmitPolicy({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const auth = useAuth();
  const act = useAction();
  const [title, setTitle] = useState('');
  const [school, setSchool] = useState(auth.activeOrg?.name ?? '');
  const [topic, setTopic] = useState(POLICY_TOPICS[0].topic);
  const [summary, setSummary] = useState('');
  const [url, setUrl] = useState('');
  const [sent, setSent] = useState(false);
  const ready = title.trim().length >= 3 && school.trim().length >= 2 && summary.trim().length >= 20 && /^https:\/\/\S+$/i.test(url.trim());

  const close = () => { setSent(false); setTitle(''); setSummary(''); setUrl(''); act.setError(null); onClose(); };
  const send = () => act.run(async () => {
    if (!auth.person) throw new Error('Sign in to add a policy.');
    await api.submitPolicy({
      title: title.trim(), school_name: school.trim(), topic,
      category: POLICY_TOPICS.find((t) => t.topic === topic)?.category ?? 'Policy & governance',
      summary: summary.trim(), url: url.trim(), submitted_by: auth.person.id,
    });
    setSent(true);
    onDone();
  });

  return (
    <Modal open={open} onClose={close} title="Share a link to a policy">
      {sent ? (
        <div className="space-y-4">
          <Notice tone="leaf">Thank you. An Ekoa admin will check your link and summary, and it will appear in the Library once approved.</Notice>
          <Button variant="dark" onClick={close}>Done</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">Share a school sustainability policy. Write a short summary in your own words and link to the full policy, which must already be public.</p>
          <Field label="Policy name" id="sp-title"><Input id="sp-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="School or organisation that wrote it" id="sp-school"><Input id="sp-school" value={school} maxLength={120} onChange={(e) => setSchool(e.target.value)} /></Field>
          <Field label="Topic" id="sp-topic"><Select id="sp-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>{POLICY_TOPICS.map((t) => <option key={t.topic}>{t.topic}</option>)}</Select></Field>
          <Field label="Summary" id="sp-summary" hint="At least 20 characters, up to 600. Use your own words."><Textarea id="sp-summary" rows={4} maxLength={600} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
          <Field label="Link to the full policy" id="sp-url" hint="Must start with https://"><Input id="sp-url" type="url" inputMode="url" value={url} maxLength={500} onChange={(e) => setUrl(e.target.value)} /></Field>
          <ErrorNote>{act.error}</ErrorNote>
          <Button variant="dark" busy={act.busy} disabled={!ready} onClick={send}>Submit for review</Button>
        </div>
      )}
    </Modal>
  );
}
