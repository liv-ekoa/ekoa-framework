import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { addTask, deleteTask, updateTask } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { ROLES, STUDENT_ROLES } from '@/lib/ekoa';
import { fmtShort, daysBetween } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import type { RoleKey, Task } from '@/lib/types';
import { Badge, Button, ErrorNote, Input, Select, cx } from '@/components/ui';

/** Add a task by typing its name and pressing Enter. Owner and due date are optional extras. */
export function QuickAddTask({ b, canEdit, onChange, autoFocus = false }: { b: ProjectBundle; canEdit: boolean; onChange: () => void; autoFocus?: boolean }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState<RoleKey>('implementation_team');
  const [due, setDue] = useState('');
  const act = useAction();
  if (!canEdit) return null;
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => { e.preventDefault(); void act.run(async () => { if (!title.trim()) throw new Error('Type what needs doing.'); await addTask({ project_id: b.project.id, title: title.trim(), owner_role: owner, status: 'todo', due_on: due || null }); setTitle(''); setDue(''); onChange(); }); }}
    >
      <div className="flex gap-2">
        <Input aria-label="New to-do" autoFocus={autoFocus} placeholder="Add a to-do, for example “Weigh the bins on Monday”" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit" busy={act.busy}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-mute">Who and when (optional)</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Select aria-label="Who is responsible" value={owner} onChange={(e) => setOwner(e.target.value as RoleKey)}>
            {[...STUDENT_ROLES, 'faculty_liaison' as RoleKey].map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
          </Select>
          <Input aria-label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </details>
      <ErrorNote>{act.error}</ErrorNote>
    </form>
  );
}

export function TaskRow({ t, canEdit, onChange }: { t: Task; canEdit: boolean; onChange: () => void }) {
  const act = useAction();
  const done = t.status === 'done';
  const overdue = !done && t.due_on && daysBetween(t.due_on) > 0;
  return (
    <li className={cx('flex items-center gap-3 rounded-field border bg-white px-3 py-2.5', overdue ? 'border-alert/40' : 'border-paper-line')}>
      <button
        role="checkbox" aria-checked={done} aria-label={`${done ? 'Mark not done' : 'Mark done'}: ${t.title}`} disabled={!canEdit}
        onClick={() => act.run(async () => { await updateTask(t.id, { status: done ? 'todo' : 'done' }); onChange(); })}
        className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2', done ? 'border-leaf bg-leaf text-white' : 'border-ink-mute/60 bg-white hover:border-leaf')}
      >{done && <Check className="h-4 w-4" />}</button>
      <span className="min-w-0 flex-1">
        <span className={cx('block font-bold', done && 'text-ink-mute line-through decoration-ink/30')}>{t.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-mute">
          <Badge>{ROLES[t.owner_role].label}</Badge>
          {t.due_on && <span className={cx(overdue && 'font-bold text-alert')}>Due {fmtShort(t.due_on)}</span>}
        </span>
      </span>
      {canEdit && <button aria-label={`Delete ${t.title}`} className="rounded p-1.5 text-ink-mute hover:text-alert" onClick={() => act.run(async () => { await deleteTask(t.id); onChange(); })}><Trash2 className="h-4 w-4" /></button>}
    </li>
  );
}

export function TasksTab({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const open = b.tasks.filter((t) => t.status !== 'done');
  const done = b.tasks.filter((t) => t.status === 'done');
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <QuickAddTask b={b} canEdit={canEdit} onChange={onChange} />
      <section aria-label="To do">
        <h2 className="mb-2 text-lg font-semibold">To do <span className="text-ink-mute">{open.length}</span></h2>
        <ul className="space-y-2">
          {open.map((t) => <TaskRow key={t.id} t={t} canEdit={canEdit} onChange={onChange} />)}
          {!open.length && <li className="rounded-panel border border-dashed border-paper-line p-5 text-center text-ink-soft">{done.length ? 'Everything is ticked off. Nice work.' : 'Nothing yet. Add the first thing your team needs to do.'}</li>}
        </ul>
      </section>
      {done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-bold text-ink-soft">Done ({done.length})</summary>
          <ul className="mt-2 space-y-2">{done.map((t) => <TaskRow key={t.id} t={t} canEdit={canEdit} onChange={onChange} />)}</ul>
        </details>
      )}
      <p className="text-sm text-ink-mute">To-dos belong to roles, not names, so they carry on when leaders change.</p>
    </div>
  );
}
