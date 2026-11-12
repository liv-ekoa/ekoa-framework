import { useEffect, useState } from 'react';
import { EyeOff, Lock } from 'lucide-react';
import * as api from '@/lib/api';
import { authorMeta, useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { relative } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import type { Post, Thread } from '@/lib/types';
import { ReportConcern } from '@/components/ReportConcern';
import { Avatar, Button, ErrorNote, Notice, Textarea } from '@/components/ui';

/** The project's team chat: one school-only thread. Loads itself and refreshes every 20 seconds. */
export function useProjectChat(projectId: string) {
  const chat = useData(async () => {
    const [threads, posts] = await Promise.all([api.listThreads(), api.listPosts()]);
    const thread = threads.find((t) => t.kind === 'project' && t.project_id === projectId) ?? null;
    return { thread, posts: thread ? posts.filter((p) => p.thread_id === thread.id) : ([] as Post[]) };
  }, [projectId]);
  const { reload } = chat;
  useEffect(() => {
    const id = setInterval(() => void reload(), 20000);
    return () => clearInterval(id);
  }, [reload]);
  return chat;
}

export function ChatTab({ b }: { b: ProjectBundle }) {
  const auth = useAuth();
  const { data, reload } = useProjectChat(b.project.id);
  const [body, setBody] = useState('');
  const [held, setHeld] = useState(false);
  const act = useAction();
  const member = auth.roles.some((r) => r.org_id === b.project.org_id);

  const send = () => act.run(async () => {
    const text = body.trim();
    if (!text) throw new Error('Write a message first.');
    if (!auth.person) throw new Error('Sign in to chat.');
    const meta = authorMeta(auth);
    let thread: Thread | null = data?.thread ?? null;
    let res: { held: string | null };
    if (thread) res = await api.addPost(thread, auth.person, text, meta);
    else res = await api.createThread({ kind: 'project', title: `${b.project.title}: team chat`, circle_id: null, org_id: b.project.org_id, record_id: null, project_id: b.project.id }, auth.person, text, meta);
    setHeld(!!res.held);
    setBody('');
    await reload();
  });

  const posts = (data?.posts ?? []).filter((p) => !p.hidden || auth.isSteward || auth.has('faculty_liaison'));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Notice tone="sky"><span className="inline-flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0" />Only your school can see this chat. Teachers can read it too. Phone numbers, emails and social handles are held back automatically.</span></Notice>
      {held && <Notice tone="clay">Your message was held for review because it looked like it had contact details in it. A teacher will check it.</Notice>}
      <ol className="space-y-3" aria-live="polite">
        {posts.map((p) => (
          <li key={p.id} className={p.hidden ? 'rounded-panel border border-alert/40 bg-alert-100/50 p-4' : 'rounded-panel border border-paper-line bg-white p-4'}>
            <div className="flex items-start gap-3">
              <Avatar name={p.author_name || 'Member'} tone={p.author_is_minor ? 'leaf' : 'moss'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><span className="font-bold">{p.author_name || 'Member'}</span> <span className="text-ink-mute">{p.author_role}. {relative(p.created_at)}</span></p>
                <p className="mt-1 whitespace-pre-line text-ink">{p.body}</p>
              </div>
              {p.hidden ? <EyeOff className="h-4 w-4 text-alert" aria-label="Held" /> : <ReportConcern variant="icon" subject={`Post by ${p.author_name} in a project chat`} />}
            </div>
          </li>
        ))}
        {!posts.length && <li className="rounded-panel border border-dashed border-paper-line p-6 text-center text-ink-soft">No messages yet. Say hello, share what you tried today, or ask the team a question.</li>}
      </ol>
      {member ? (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <Textarea aria-label="Message to your team" rows={3} placeholder="What happened today? What do you need help with?" value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} />
          <ErrorNote>{act.error}</ErrorNote>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-mute">Press Ctrl or Cmd and Enter to send.</p>
            <Button type="submit" variant="dark" busy={act.busy}>Send</Button>
          </div>
        </form>
      ) : <p className="text-sm text-ink-mute">Only members of this school can post here.</p>}
    </div>
  );
}
