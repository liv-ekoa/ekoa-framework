import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { addProjectComment, deleteProjectComment, listProjectComments } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { relative } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import { Button, Empty, ErrorNote, Field, Loading, Panel, Textarea } from '@/components/ui';

/** A shared thread where teachers and the team leave feedback on a project, drafts included. Everyone who can see the project can read it. */
export function FeedbackTab({ b }: { b: Pick<ProjectBundle, 'project'> }) {
  const auth = useAuth();
  const { data, reload } = useData(() => listProjectComments(b.project.id), [b.project.id]);
  const [body, setBody] = useState('');
  const act = useAction();
  if (!data) return <Loading />;
  const isTeacher = auth.has('faculty_liaison', b.project.org_id);
  return (
    <div className="space-y-5">
      <Panel title="Feedback">
        <p className="mb-4 text-sm text-ink-soft">A shared thread for this project. Teachers and the team can all read it, so keep it about the work. Phone numbers, emails and social handles are not allowed.</p>
        {data.length === 0 ? <Empty title="No feedback yet">Teachers can leave notes here on a draft, and the team can reply.</Empty> : (
          <ul className="space-y-3">
            {data.map((c) => (
              <li key={c.id} className="rounded-field border border-paper-line bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><span className="font-bold">{c.author_name}</span> <span className="text-ink-mute">{c.author_role}. {relative(c.created_at)}</span></span>
                  {(isTeacher || c.person_id === auth.person?.id) && (
                    <button className="rounded-field p-1 text-ink-mute hover:bg-paper-deep hover:text-ink" aria-label="Delete comment" onClick={() => void act.run(async () => { await deleteProjectComment(c.id); reload(); })}><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-ink-soft">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Add feedback">
        <Field label="Your comment" id="fb-body"><Textarea id="fb-body" rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <ErrorNote>{act.error}</ErrorNote>
        <Button className="mt-3" variant="dark" busy={act.busy} disabled={!body.trim()} onClick={() => act.run(async () => { await addProjectComment(b.project.org_id, b.project.id, body); setBody(''); reload(); })}>Post</Button>
      </Panel>
    </div>
  );
}
