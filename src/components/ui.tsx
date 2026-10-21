import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

type Variant = 'primary' | 'dark' | 'ghost' | 'quiet' | 'danger' | 'clay';
const variants: Record<Variant, string> = {
  primary: 'bg-leaf text-white hover:bg-leaf-600 border border-leaf-600',
  dark: 'bg-moss text-paper hover:bg-moss-800 border border-moss-800',
  ghost: 'bg-white text-ink border border-paper-line hover:border-ink/40',
  quiet: 'bg-transparent text-ink-soft hover:text-ink hover:bg-paper-deep border border-transparent',
  danger: 'bg-white text-alert border border-alert/40 hover:bg-alert-100',
  clay: 'bg-clay-600 text-white hover:bg-clay-700 border border-clay-700',
};
const sizes = { sm: 'px-3 py-1 text-sm', md: 'px-5 py-2 text-base', lg: 'px-6 py-3 text-lg' };

export function Button({
  variant = 'primary', size = 'md', busy, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={cx('inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50', variants[variant], sizes[size], className)}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = 'primary', size = 'md', className, ...rest }: LinkProps & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link {...rest} className={cx('inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors', variants[variant], sizes[size], className)} />;
}

export function Field({ label, hint, error, children, id }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; id?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-bold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-mute">{hint}</p>}
      {error && <p className="text-xs font-bold text-alert">{error}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx('field-input', props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={cx('field-input resize-y leading-relaxed', props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx('field-input cursor-pointer pr-8', props.className)} />;
}

export function Checkbox({ label, checked, onChange, disabled, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cx('flex items-start gap-3', disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-leaf" />
      <span>
        <span className="text-base text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-mute">{hint}</span>}
      </span>
    </label>
  );
}

type Tone = 'leaf' | 'clay' | 'lesson' | 'mute' | 'sky' | 'alert' | 'ink';
const tones: Record<Tone, string> = {
  leaf: 'bg-leaf-100 text-leaf-600 border-leaf/25',
  clay: 'bg-clay-100 text-clay-700 border-clay-600/30',
  lesson: 'bg-lesson-100 text-lesson-600 border-lesson/25',
  mute: 'bg-paper-deep text-ink-soft border-paper-line',
  sky: 'bg-sky-100 text-sky border-sky/25',
  alert: 'bg-alert-100 text-alert border-alert/25',
  ink: 'bg-moss text-paper border-moss',
};
export function Badge({ tone = 'mute', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-tag border px-2 py-0.5 text-xs font-bold', tones[tone], className)}>{children}</span>;
}

export function Panel({ children, className, title, action, id }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <section id={id} className={cx('min-w-0 rounded-panel border border-paper-line bg-white p-5 sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          {title && <h2 className="text-xl not-italic">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, lead, actions, children }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-paper-line pb-5">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {lead && <p className="mt-2 text-ink-soft">{lead}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-paper-line bg-paper/60 p-8 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-ink-mute" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-field border border-alert/30 bg-alert-100 px-3 py-2 text-sm font-bold text-alert">
      {children}
    </p>
  );
}

export function Notice({ tone = 'sky', children }: { tone?: 'sky' | 'clay' | 'leaf' | 'lesson'; children: ReactNode }) {
  const t = { sky: 'border-sky/30 bg-sky-100', clay: 'border-clay-600/40 bg-clay-100', leaf: 'border-leaf/30 bg-leaf-50', lesson: 'border-lesson/30 bg-lesson-100' }[tone];
  return <div className={cx('rounded-field border px-4 py-3 text-sm text-ink', t)}>{children}</div>;
}

export function Meter({ value, tone = 'leaf', label }: { value: number; tone?: 'leaf' | 'clay' | 'lesson' | 'alert'; label: string }) {
  const c = { leaf: 'bg-leaf', clay: 'bg-clay-600', lesson: 'bg-lesson', alert: 'bg-alert' }[tone];
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-paper-deep">
      <div className={cx('h-full rounded-full', c)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ name, tone = 'moss' }: { name: string; tone?: 'moss' | 'leaf' | 'lesson' }) {
  const t = { moss: 'bg-moss text-paper', leaf: 'bg-leaf-100 text-leaf-600', lesson: 'bg-lesson-100 text-lesson-600' }[tone];
  const parts = name.replace(/^(Dr|Mr|Mrs|Ms|Prof)\.?\s+/i, '').split(/\s+/);
  const ini = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (
    <span aria-hidden className={cx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold', t)}>
      {ini.toUpperCase()}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,textarea,select,button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-panel bg-white p-5 shadow-xl sm:rounded-panel sm:p-6', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-field p-1 text-ink-mute hover:bg-paper-deep hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { key: T; label: ReactNode; count?: number }[]; value: T; onChange: (k: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-paper-line px-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            '-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-bold transition-colors',
            value === t.key ? 'border-leaf text-ink' : 'border-transparent text-ink-mute hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded-tag bg-paper-deep px-1.5 text-xs text-ink-soft">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function KeyValue({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v], i) => (
        <div key={i}>
          <dt className="text-xs text-ink-mute">{k}</dt>
          <dd className="text-base text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
