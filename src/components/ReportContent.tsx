import { useState } from 'react';
import { Flag } from 'lucide-react';
import { reportContent } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { FLAG_REASONS, type FlagReason } from '@/lib/moderation';
import { Button, ErrorNote, Field, Modal, Notice, Select, Textarea, cx } from './ui';

const REASONS: FlagReason[] = ['bullying', 'sexual', 'violence', 'hate', 'self_harm', 'contact', 'other'];

/** One tap to report a post, photo or link. It disappears for everyone straight away and goes to
 *  the author's teacher; an adult then removes it for good or puts it back. */
export function ReportContent({ kind, id, what, onDone, className }: { kind: 'post' | 'evidence' | 'policy_link'; id: string; what: string; onDone?: () => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason>('bullying');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const act = useAction();
  const close = () => { setOpen(false); if (done) onDone?.(); setDone(false); setNote(''); };
  return (
    <>
      <button onClick={() => setOpen(true)} title={`Report this ${what}`} className={cx('inline-flex items-center gap-1 rounded-field p-1.5 text-xs font-bold text-ink-mute hover:bg-alert-100 hover:text-alert', className)}>
        <Flag className="h-4 w-4" aria-hidden /><span className="sr-only sm:not-sr-only">Report</span>
      </button>
      <Modal open={open} onClose={close} title={`Report this ${what}`}>
        {done ? (
          <div className="space-y-3">
            <Notice tone="leaf">Thank you. It is hidden now, and a teacher will look at it.</Notice>
            {reason === 'self_harm' && <p className="text-sm text-ink-soft">If someone is in danger right now, tell a teacher or another adult straight away. In India you can call 112, or Childline on 1098.</p>}
            <Button onClick={close}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">It will be hidden from everyone straight away. The author’s teacher and the Ekoa team will see your report. The author is not told who reported it.</p>
            <Field label="What is wrong?" id="rc-r">
              <Select id="rc-r" value={reason} onChange={(e) => setReason(e.target.value as FlagReason)}>
                {REASONS.map((r) => <option key={r} value={r}>{FLAG_REASONS[r].report}</option>)}
              </Select>
            </Field>
            <Field label="Anything else the teacher should know? (optional)" id="rc-n"><Textarea id="rc-n" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <ErrorNote>{act.error}</ErrorNote>
            <Button variant="danger" busy={act.busy} onClick={() => act.run(async () => { await reportContent(kind, id, reason, note); setDone(true); })}>Report and hide it</Button>
          </div>
        )}
      </Modal>
    </>
  );
}
