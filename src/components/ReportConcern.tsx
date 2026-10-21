import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { submitConcern } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { Button, ErrorNote, Field, Input, Modal, Notice, Select, Textarea, cx } from './ui';

/** Available on every page. Reports go to the Ekoa safeguarding lead with a 24-hour response target. */
export function ReportConcern({ subject = '', variant = 'link', light = false }: { subject?: string; variant?: 'link' | 'button' | 'icon'; light?: boolean }) {
  const { person } = useAuth();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [category, setCategory] = useState<'contact' | 'content' | 'privacy' | 'wellbeing' | 'other'>('contact');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const [about, setAbout] = useState(subject);
  const act = useAction();
  const send = () =>
    act.run(async () => {
      if (details.trim().length < 10) throw new Error('Describe what happened in a sentence or two.');
      await submitConcern({ reporter_person_id: person?.id ?? null, reporter_contact: person ? person.display_name : contact || 'Anonymous', subject_ref: about || 'Not specified', category, details });
      setDone(true);
    });
  return (
    <>
      {variant === 'icon' ? (
        <button onClick={() => setOpen(true)} title="Report a concern about this post" className="rounded-field p-1.5 text-ink-mute hover:bg-alert-100 hover:text-alert">
          <ShieldAlert className="h-4 w-4" aria-hidden /><span className="sr-only">Report a concern about this post</span>
        </button>
      ) : variant === 'button' ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <ShieldAlert className="h-4 w-4" /> Report a concern
        </Button>
      ) : (
        <button onClick={() => setOpen(true)} className={cx('inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 hover:underline', light ? 'text-paper/80' : 'text-alert')}>
          <ShieldAlert className="h-4 w-4" aria-hidden /> Report a concern
        </button>
      )}
      <Modal open={open} onClose={() => { setOpen(false); setDone(false); }} title="Report a concern">
        {done ? (
          <div className="space-y-3">
            <Notice tone="leaf">Your report has reached the Ekoa safeguarding lead. They respond within 24 hours.</Notice>
            <p className="text-sm text-ink-soft">If a child is in immediate danger, call your local emergency number now. In India, Childline is 1098.</p>
            <Button onClick={() => { setOpen(false); setDone(false); setDetails(''); }}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">Tell us about anything that made you or someone else feel unsafe or uncomfortable: a message, a request for contact details, a photo, or anything else. You can report anonymously.</p>
            <Field label="What kind of concern?">
              <Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                <option value="contact">Someone tried to contact a student privately</option>
                <option value="content">Inappropriate content</option>
                <option value="privacy">Personal details shared</option>
                <option value="wellbeing">Worried about someone’s wellbeing</option>
                <option value="other">Something else</option>
              </Select>
            </Field>
            <Field label="Where did it happen?" hint="For example, the thread title or page.">
              <Input value={about} onChange={(e) => setAbout(e.target.value)} />
            </Field>
            <Field label="What happened?">
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} />
            </Field>
            {!person && (
              <Field label="How can we reach you? (optional)">
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone, or leave blank" />
              </Field>
            )}
            <ErrorNote>{act.error}</ErrorNote>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={send} busy={act.busy}>Send report</Button>
              <span className="text-xs text-ink-mute">Emergency in India: call 112 or Childline 1098.</span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
