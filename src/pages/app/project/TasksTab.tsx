import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { addTask, deleteTask, updateTask } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { ROLES, STUDENT_ROLES } from '@/lib/ekoa';
import { fmtShort, daysBetween } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import type { RoleKey, Task } from '@/lib/types';
import { Badge, Button, ErrorNote, Input, Select, cx } from '@/components/ui';

const COLS: { key: Task['status']; label: string }[] = [
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'Doing' },
  { key: 'done', label: 'Done' },
];

export function TasksTab({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState<RoleKey>('implementation_team');
  const [due, setDue] = useState('');
  const act = useAction();
  return (
    <div className="space-y-5">
      {canEdit && (
        <form
          className="grid gap-2 rounded-panel border border-paper-line bg-white p-4 sm:grid-cols-[1fr_200px_160px_auto]"
          onSubmit={(e) => { e.preventDefault(); void act.run(async () => { if (!title.trim()) throw new Error('Name the task.'); await addTask({ project_id: b.project.id, title: title.trim(), owner_role: owner, status: 'todo', due_on: due || null }); setTitle(''); setDue(''); onChange(); }); }}
        >
          <Input aria-label="New task" placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select aria-label="Owner role" value={owner} onChange={(e) => setOwner(e.target.value as RoleKey)}>
            {[...STUDENT_ROLES, 'faculty_liaison' as RoleKey].map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
          </Select>
          <Input aria-label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <Button type="submit" busy={act.busy}><Plus className="h-4 w-4" /> Add</Button>
        </form>
      )}
      <ErrorNote>{act.error}</ErrorNote>
      <p className="text-sm text-ink-mute">Tasks are owned by roles, not names, so they survive a change of leaders.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {COLS.map((c) => {
          const items = b.tasks.filter((t) => t.status === c.key);
          return (
            <section key={c.key} className="rounded-panel bg-paper-deep/60 p-3" aria-label={c.label}>
              <h3 className="mb-3 px-1 label-caps text-ink-mute">{c.label} <span className="text-ink-mute">{items.length}</span></h3>
              <ul className="space-y-2">
                {items.map((t) => {
                  const overdue = t.status !== 'done' && t.due_on && daysBetween(t.due_on) > 0;
                  return (
                    <li key={t.id} className={cx('rounded-field border bg-white p-3', overdue ? 'border-alert/40' : 'border-paper-line')}>
                      <p className={cx('font-bold', t.status === 'done' && 'text-ink-mute line-through decoration-ink/30')}>{t.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-mute">
                        <Badge>{ROLES[t.owner_role].label}</Badge>
                        {t.due_on && <span className={cx(overdue && 'font-bold text-alert')}>Due {fmtShort(t.due_on)}</span>}
                      </div>
                      {canEdit && (
                        <div className="mt-2 flex items-center gap-1">
                          <Select aria-label="Move task" value={t.status} onChange={(e) => act.run(async () => { await updateTask(t.id, { status: e.target.value as Task['status'] }); onChange(); })} className="py-1 text-sm">
                            {COLS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                          </Select>
                          <button aria-label="Delete task" className="rounded p-1.5 text-ink-mute hover:text-alert" onClick={() => act.run(async () => { await deleteTask(t.id); onChange(); })}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </li>
                  );
                })}
                {!items.length && <li className="px-1 text-sm text-ink-mute">Nothing here.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
